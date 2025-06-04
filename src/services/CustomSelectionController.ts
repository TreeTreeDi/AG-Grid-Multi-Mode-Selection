import type {
  GridApi,
  ColumnApi,
  Column,
  RowNode,
  CellClickedEvent,
  CellRange
} from 'ag-grid-community';
import type { SelectionState, SelectionContext, SelectionMode } from '../types/selection';

export class CustomSelectionController {
  private gridApi: GridApi;
  private columnApi: ColumnApi;
  private selectionState: SelectionState;

  constructor(gridApi: GridApi, columnApi: ColumnApi) {
    this.gridApi = gridApi;
    this.columnApi = columnApi;
    
    this.selectionState = {
      selectedColumns: new Set(),
      lastClickedColumn: null,
      lastClickedRow: null,
      selectionMode: null,
      selectedCellIds: new Set(),
      lastClickedCellPosition: null,
      dragStartState: null
    };
  }

  // 核心方法：处理单元格点击
  onCellClicked = (params: CellClickedEvent): void => {
    const { node, event } = params;
    
    if (this.isRowNumberColumn(params)) {
      if (event && 'shiftKey' in event && 'ctrlKey' in event && 'metaKey' in event) {
        const mouseEvent = event as MouseEvent;
        this.handleRowSelection(node, mouseEvent.shiftKey, mouseEvent.ctrlKey || mouseEvent.metaKey);
      } else {
        this.handleRowSelection(node, false, false);
      }
    } else {
      if (event && 'shiftKey' in event && 'ctrlKey' in event && 'metaKey' in event) {
        const mouseEvent = event as MouseEvent;
        this.handleCellSelection(params, mouseEvent.shiftKey, mouseEvent.ctrlKey || mouseEvent.metaKey);
      } else {
        this.handleCellSelection(params, false, false);
      }
    }
  };

  // 核心方法：处理列头点击
  onHeaderClicked = (column: Column, event?: MouseEvent): void => {
    // 阻止默认排序行为
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.handleColumnSelection(column,
      event?.shiftKey || false,
      event?.ctrlKey || event?.metaKey || false
    );
  };

  // 行选择处理
  private handleRowSelection(rowNode: RowNode, isShiftKey: boolean, isCtrlKey: boolean): void {
    this.clearOtherSelections('row');
    this.selectionState.selectionMode = 'row';

    if (isShiftKey && this.selectionState.lastClickedRow && this.selectionState.lastClickedRow !== rowNode) {
      this.selectRowRange(this.selectionState.lastClickedRow, rowNode);
    } else if (isCtrlKey) {
      // Ctrl+点击：切换当前行的选中状态
      rowNode.setSelected(!rowNode.isSelected());
    } else {
      // 单选行：清除其他选择，并选中当前行
      const isCurrentlySelected = rowNode.isSelected();
      const selectedNodes = this.gridApi.getSelectedNodes();
      
      if (selectedNodes.length > 1 || !isCurrentlySelected) {
        this.gridApi.deselectAll();
        rowNode.setSelected(true);
      } else if (selectedNodes.length === 1 && isCurrentlySelected) {
        // 如果只选中了当前行，并且再次点击，则确保它仍然是唯一选中的
        this.gridApi.deselectAll();
        rowNode.setSelected(true);
      }
    }
    
    this.selectionState.lastClickedRow = rowNode;
  }

  // 列选择处理
  private handleColumnSelection(column: Column, isShiftKey: boolean, isCtrlKey: boolean): void {
    this.clearOtherSelections('column');
    this.selectionState.selectionMode = 'column';

    const colId = column.getColId();

    if (isShiftKey && this.selectionState.lastClickedColumn) {
      this.selectColumnRange(this.selectionState.lastClickedColumn, column);
    } else if (isCtrlKey) {
      // Ctrl+点击：多选列
      if (this.selectionState.selectedColumns.has(colId)) {
        this.selectionState.selectedColumns.delete(colId);
      } else {
        this.selectionState.selectedColumns.add(colId);
      }
    } else {
      // 单选列：清除其他选择
      this.selectionState.selectedColumns.clear();
      this.selectionState.selectedColumns.add(colId);
    }

    this.selectionState.lastClickedColumn = column;
    this.updateColumnSelection();
  }

  // 单元格选择处理（保留原有接口，内部调用新的handleCellClick）
  private handleCellSelection(params: CellClickedEvent, isShiftKey: boolean, isCtrlKey: boolean): void {
    this.handleCellClick(params, isShiftKey, isCtrlKey);
  }

  // 手动单元格点击处理
  private handleCellClick(params: CellClickedEvent, isShiftKey: boolean, isCtrlKey: boolean): void {
    const { rowIndex, column } = params;
    if (rowIndex === null || rowIndex === undefined || !column) return; // 无效点击

    // 如果正在拖拽，忽略点击事件（避免与拖拽操作冲突）
    if (this.selectionState.dragStartState?.dragging) return;

    const colId = column.getColId();
    const cellId = this.getCellId(rowIndex, colId);

    // 前置处理
    this.clearOtherSelections('cell');
    this.selectionState.selectionMode = 'cell';

    if (isCtrlKey) {
      // Ctrl+点击：切换当前单元格的选中状态
      if (this.selectionState.selectedCellIds.has(cellId)) {
        this.selectionState.selectedCellIds.delete(cellId);
      } else {
        this.selectionState.selectedCellIds.add(cellId);
      }
      this.selectionState.lastClickedCellPosition = { rowIndex, colId };
    } else if (isShiftKey && this.selectionState.lastClickedCellPosition) {
      // Shift+点击：范围选择
      const currentCellPos = { rowIndex, colId };
      const rangeCellIds = this.getCellsInRectangularRange(
        this.selectionState.lastClickedCellPosition,
        currentCellPos
      );
      this.selectionState.selectedCellIds.clear();
      rangeCellIds.forEach(id => this.selectionState.selectedCellIds.add(id));
      // Shift选择通常不更新锚点，保持原有的lastClickedCellPosition
    } else {
      // 普通单击：清除其他选择并选中当前单元格
      this.selectionState.selectedCellIds.clear();
      this.selectionState.selectedCellIds.add(cellId);
      this.selectionState.lastClickedCellPosition = { rowIndex, colId };
    }

    // 更新视觉高亮
    this.updateManualCellHighlights();
  }

  // 选择行范围
  private selectRowRange(startRowNode: RowNode, endRowNode: RowNode): void {
    const startIndex = startRowNode.rowIndex!;
    const endIndex = endRowNode.rowIndex!;
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    // 先清除所有选择
    this.gridApi.deselectAll();

    // 选择范围内的所有行
    for (let i = minIndex; i <= maxIndex; i++) {
      const rowNodeAtIndex = this.gridApi.getDisplayedRowAtIndex(i);
      if (rowNodeAtIndex) {
        rowNodeAtIndex.setSelected(true);
      }
    }
  }

  // 选择列范围
  private selectColumnRange(startColumn: Column, endColumn: Column): void {
    const allColumns = this.columnApi.getAllColumns();
    if (!allColumns) return;
    
    const startIndex = allColumns.findIndex(col => col.getColId() === startColumn.getColId());
    const endIndex = allColumns.findIndex(col => col.getColId() === endColumn.getColId());
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    // 选择范围内的所有列
    for (let i = minIndex; i <= maxIndex; i++) {
      this.selectionState.selectedColumns.add(allColumns[i].getColId());
    }

    this.updateColumnSelection();
  }

  // 更新列选择的视觉效果 (使用自定义CSS类)
  private updateColumnSelection(): void {
    // 1. 先清除所有列的自定义高亮
    this.clearAllColumnHighlights();

    // 2. 为当前选中的列添加高亮
    this.selectionState.selectedColumns.forEach(colId => {
      const column = this.columnApi.getColumn(colId);
      if (column) {
        this.addColumnHighlight(column);
      }
    });
  }

  // 清除所有列的自定义高亮
  private clearAllColumnHighlights(): void {
    const allColumns = this.columnApi.getAllDisplayedColumns();
    allColumns?.forEach(column => {
      this.removeColumnHighlight(column);
    });
  }

  // 为指定列添加高亮
  private addColumnHighlight(column: Column): void {
    const colId = column.getColId();
    this.gridApi.forEachNodeAfterFilterAndSort(rowNode => {
      const cellElement = this.getCellElement(rowNode, colId);
      if (cellElement) {
        cellElement.classList.add('ag-column-selected-custom');
      }
    });

    // 同时高亮列头
    const headerElement = document.querySelector(`[col-id="${colId}"]`) as HTMLElement;
    if (headerElement) {
      headerElement.classList.add('ag-header-selected-custom');
    }
  }

  // 移除指定列的高亮
  private removeColumnHighlight(column: Column): void {
    const colId = column.getColId();
    this.gridApi.forEachNodeAfterFilterAndSort(rowNode => {
      const cellElement = this.getCellElement(rowNode, colId);
      if (cellElement) {
        cellElement.classList.remove('ag-column-selected-custom');
      }
    });

    // 同时移除列头高亮
    const headerElement = document.querySelector(`[col-id="${colId}"]`) as HTMLElement;
    if (headerElement) {
      headerElement.classList.remove('ag-header-selected-custom');
    }
  }

  // 获取单元格DOM元素
  private getCellElement(rowNode: RowNode, colId: string): HTMLElement | null {
    const rowIndex = rowNode.rowIndex;
    if (rowIndex === null || rowIndex === undefined) {
      return null;
    }

    // 首先尝试更精确的DOM查询
    let cellElement = document.querySelector(
      `.ag-center-cols-container [row-index="${rowIndex}"] [col-id="${colId}"]`
    ) as HTMLElement;

    if (!cellElement) {
      // 尝试另一种选择器格式
      cellElement = document.querySelector(
        `[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`
      ) as HTMLElement;
    }

    if (!cellElement) {
      // 尝试第三种选择器格式
      cellElement = document.querySelector(
        `.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`
      ) as HTMLElement;
    }

    // 仍然保留原来的 getCellRendererInstances 作为最后的尝试
    if (!cellElement) {
      try {
        const cellRendererInstances = this.gridApi.getCellRendererInstances({
          rowNodes: [rowNode],
          columns: [colId]
        });
        
        if (cellRendererInstances && cellRendererInstances.length > 0) {
          cellElement = cellRendererInstances[0].getGui();
        }
      } catch {
        // 如果所有方法都失败，返回 null
      }
    }

    return cellElement;
  }

  // 清除其他选择
  private clearOtherSelections(keepMode: SelectionMode): void {
    if (keepMode !== 'row') {
      this.gridApi.deselectAll();
    }
    if (keepMode !== 'column') {
      this.selectionState.selectedColumns.clear();
      this.clearAllColumnHighlights(); // 清除列高亮
    }
    if (keepMode !== 'cell') {
      this.selectionState.selectedCellIds.clear();
      this.selectionState.lastClickedCellPosition = null;
      this.selectionState.dragStartState = null;
      this.updateManualCellHighlights(); // 清除单元格高亮
    }
  }

  // 判断是否点击行号列
  private isRowNumberColumn(params: CellClickedEvent): boolean {
    return params.column && (
      params.column.getColId() === 'rowNumber' ||
      !!params.column.getColDef().checkboxSelection ||
      !!params.column.getColDef().headerCheckboxSelection
    );
  }

  // 获取当前选择状态
  getCurrentSelectionContext(): SelectionContext {
    const selectedRows = this.gridApi.getSelectedNodes();
    const cellRanges = this.gridApi.getCellRanges() || [];
    
    return {
      selectionMode: this.selectionState.selectionMode,
      hasSelectedRows: selectedRows.length > 0,
      hasSelectedColumns: this.selectionState.selectedColumns.size > 0,
      hasSelectedCells: this.selectionState.selectedCellIds.size > 0 || cellRanges.length > 0,
      selectedRowCount: selectedRows.length,
      selectedColumnCount: this.selectionState.selectedColumns.size,
      cellRangeCount: this.selectionState.selectedCellIds.size > 0 ? this.selectionState.selectedCellIds.size : cellRanges.length,
      
      // 详细信息
      selectedRows: selectedRows,
      selectedColumns: Array.from(this.selectionState.selectedColumns),
      cellRanges: cellRanges, // 保留原有的cellRanges字段，但主要使用selectedCellIds
      
      // 判断是否为单个单元格
      isSingleCell: this.selectionState.selectedCellIds.size === 1 || (cellRanges.length === 1 && this.isSingleCellRange(cellRanges[0]))
    };
  }

  // 判断是否为单个单元格范围
  private isSingleCellRange(range: CellRange): boolean {
    return range.startRow === range.endRow && 
           range.columns.length === 1;
  }

  // 清除所有选择
  clearAllSelections(): void {
    this.gridApi.deselectAll();
    // clearRangeSelection 是企业版功能，在 Community 版本中不调用
    // this.gridApi.clearRangeSelection();
    this.selectionState.selectedColumns.clear();
    this.clearAllColumnHighlights(); // 清除列高亮
    this.selectionState.selectedCellIds.clear();
    this.updateManualCellHighlights(); // 清除单元格高亮
    this.selectionState.lastClickedColumn = null;
    this.selectionState.lastClickedRow = null;
    this.selectionState.lastClickedCellPosition = null;
    this.selectionState.dragStartState = null;
    this.selectionState.selectionMode = null;
  }

  // 单元格选择辅助方法
  private getCellId(rowIndex: number, colId: string): string {
    return `${rowIndex}_${colId}`;
  }

  private parseCellId(cellId: string): { rowIndex: number; colId: string } | null {
    const parts = cellId.split('_');
    if (parts.length === 2) {
      const rowIndex = parseInt(parts[0], 10);
      if (!isNaN(rowIndex)) {
        return { rowIndex, colId: parts[1] };
      }
    }
    return null;
  }

  // 计算矩形范围内的所有单元格
  private getCellsInRectangularRange(
    startPos: { rowIndex: number; colId: string },
    endPos: { rowIndex: number; colId: string }
  ): string[] {
    const cells: string[] = [];
    const allDisplayedColumns = this.columnApi.getAllDisplayedColumns();
    const colStartIndex = allDisplayedColumns.findIndex(c => c.getColId() === startPos.colId);
    const colEndIndex = allDisplayedColumns.findIndex(c => c.getColId() === endPos.colId);

    if (colStartIndex === -1 || colEndIndex === -1) return []; // 列无效

    const minRow = Math.min(startPos.rowIndex, endPos.rowIndex);
    const maxRow = Math.max(startPos.rowIndex, endPos.rowIndex);
    const minColIdx = Math.min(colStartIndex, colEndIndex);
    const maxColIdx = Math.max(colStartIndex, colEndIndex);

    for (let r = minRow; r <= maxRow; r++) {
      // 确保行存在且可见
      const rowNode = this.gridApi.getDisplayedRowAtIndex(r);
      if (rowNode) {
        for (let c = minColIdx; c <= maxColIdx; c++) {
          cells.push(this.getCellId(r, allDisplayedColumns[c].getColId()));
        }
      }
    }
    return cells;
  }

  // 比较两个 Set 是否相等（用于性能优化）
  private areSetsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
      if (!setB.has(item)) return false;
    }
    return true;
  }

  // 更新手动单元格高亮
  private updateManualCellHighlights(): void {
    // 1. 清除所有单元格的自定义高亮
    this.gridApi.forEachNode(node => {
      if (node.displayed) { // 只处理显示的节点
        this.columnApi.getAllDisplayedColumns().forEach(column => {
          const cellElement = this.getCellElement(node, column.getColId());
          if (cellElement) {
            cellElement.classList.remove('ag-cell-selected-manual');
          }
        });
      }
    });

    // 2. 为 selectedCellIds 中的单元格添加高亮
    this.selectionState.selectedCellIds.forEach(cellId => {
      const cellInfo = this.parseCellId(cellId);
      if (cellInfo) {
        const rowNode = this.gridApi.getDisplayedRowAtIndex(cellInfo.rowIndex);
        if (rowNode) {
          const cellElement = this.getCellElement(rowNode, cellInfo.colId);
          if (cellElement) {
            cellElement.classList.add('ag-cell-selected-manual');
          }
        }
      }
    });
  }

  // 获取选择的数据
  getSelectedData(): unknown {
    const context = this.getCurrentSelectionContext();
    
    switch (context.selectionMode) {
      case 'row':
        return this.gridApi.getSelectedRows();
      case 'column':
        return this.getSelectedColumnData();
      case 'cell':
        return this.getSelectedManualCellData();
      default:
        return null;
    }
  }

  // 获取选中的列数据
  private getSelectedColumnData(): unknown[][] {
    const data: unknown[][] = [];
    
    this.selectionState.selectedColumns.forEach(colId => {
      const columnData: unknown[] = [];
      
      this.gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
        const value = this.gridApi.getValue(colId, rowNode);
        columnData.push(value || '');
      });
      
      data.push(columnData);
    });

    return data;
  }


  // 获取手动选中单元格的数据（基于selectedCellIds）
  private getSelectedManualCellData(): unknown[][] {
    const data: unknown[][] = [];
    
    this.selectionState.selectedCellIds.forEach(cellId => {
      const cellInfo = this.parseCellId(cellId);
      if (cellInfo) {
        const rowNode = this.gridApi.getDisplayedRowAtIndex(cellInfo.rowIndex);
        if (rowNode) {
          const column = this.columnApi.getColumn(cellInfo.colId);
          if (column) {
            const value = this.gridApi.getValue(column, rowNode);
            data.push([value]);
          }
        }
      }
    });

    return data;
  }

  // 拖拽处理方法 - 当在表格上按下鼠标时由 App.tsx 调用
  public onTableMouseDown(event: MouseEvent, gridCell: {rowIndex: number, colId: string, node: RowNode, column: Column} | null): boolean {
    if (!gridCell) return false;

    this.clearOtherSelections('cell');
    this.selectionState.selectionMode = 'cell';
    
    this.selectionState.selectedCellIds.clear();
    const cellId = this.getCellId(gridCell.rowIndex, gridCell.colId);
    this.selectionState.selectedCellIds.add(cellId);
    
    this.selectionState.dragStartState = {
      startRowIndex: gridCell.rowIndex,
      startColId: gridCell.colId,
      dragging: true
    };
    this.selectionState.lastClickedCellPosition = { rowIndex: gridCell.rowIndex, colId: gridCell.colId };
    
    this.updateManualCellHighlights();
    event.preventDefault(); // 阻止默认的文本选择等行为
    return true;
  }

  // 拖拽处理方法 - 当鼠标在 document 上移动时由 App.tsx 调用（如果拖拽已开始）
  public onTableMouseMove(currentGridCell: {rowIndex: number, colId: string} | null): void {
    if (!this.selectionState.dragStartState?.dragging) return;

    if (currentGridCell) {
      const { startRowIndex, startColId } = this.selectionState.dragStartState;
      const rangeCellIds = this.getCellsInRectangularRange(
        { rowIndex: startRowIndex, colId: startColId },
        { rowIndex: currentGridCell.rowIndex, colId: currentGridCell.colId }
      );
      
      // 优化：只有当选择范围实际改变时才更新，以减少不必要的重绘
      const newSelectedCellIds = new Set(rangeCellIds);
      if (!this.areSetsEqual(this.selectionState.selectedCellIds, newSelectedCellIds)) {
          this.selectionState.selectedCellIds = newSelectedCellIds;
          this.updateManualCellHighlights();
      }
    }
    // 如果 currentGridCell 为 null (鼠标移出表格有效单元格区域)，保持上一次的有效选择
  }

  // 拖拽处理方法 - 当在 document 上释放鼠标时由 App.tsx 调用（如果拖拽已开始）
  public onTableMouseUp(): void {
    if (this.selectionState.dragStartState?.dragging) {
      // 最终的选择状态已在 mousemove 中更新
      this.selectionState.dragStartState = null;
    }
  }
}