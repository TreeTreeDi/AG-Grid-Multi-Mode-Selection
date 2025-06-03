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
      selectionMode: null
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

  // 单元格选择处理
  private handleCellSelection(params: CellClickedEvent, isShiftKey: boolean, isCtrlKey: boolean): void {
    this.clearOtherSelections('cell');
    this.selectionState.selectionMode = 'cell';

    if (!isShiftKey && !isCtrlKey) {
      // 单选单元格：清除其他范围选择
      this.gridApi.clearRangeSelection();
    }

    // 使用 addCellRange API 添加单元格选择 (企业版功能)
    // 在 Community 版本中，我们将不调用此 API 以避免错误
    // 这意味着单元格选择的视觉反馈（范围高亮）将不会出现
    /*
    const cellRange: CellRangeParams = {
      rowStartIndex: params.rowIndex,
      rowEndIndex: params.rowIndex,
      columnStart: params.column,
      columnEnd: params.column
    };
    this.gridApi.addCellRange(cellRange);
    */
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

    console.log(`[CustomSelectionController] getCellElement for row ${rowIndex}, col ${colId}:`, cellElement ? 'found' : 'not found');
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
      // 只有在不保持单元格选择时才清除范围选择
      // 注意：列选择也使用范围选择，所以需要小心处理
      if (keepMode !== 'column') {
        // clearRangeSelection 是企业版功能，在 Community 版本中不应调用
        // if (this.gridApi) {
        //   try {
        //     this.gridApi.clearRangeSelection();
        //     console.log('[CustomSelectionController] Range selection cleared successfully.');
        //   } catch (error) {
        //     console.error('[CustomSelectionController] Error clearing range selection:', error);
        //   }
        // } else {
        //   console.warn('[CustomSelectionController] Grid API not available when trying to clear range selection.');
        // }
      }
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
      hasSelectedCells: cellRanges.length > 0,
      selectedRowCount: selectedRows.length,
      selectedColumnCount: this.selectionState.selectedColumns.size,
      cellRangeCount: cellRanges.length,
      
      // 详细信息
      selectedRows: selectedRows,
      selectedColumns: Array.from(this.selectionState.selectedColumns),
      cellRanges: cellRanges,
      
      // 判断是否为单个单元格
      isSingleCell: cellRanges.length === 1 && this.isSingleCellRange(cellRanges[0])
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
    this.selectionState.lastClickedColumn = null;
    this.selectionState.lastClickedRow = null;
    this.selectionState.selectionMode = null;
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
        return this.getSelectedCellData();
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

  // 获取选中的单元格数据
  private getSelectedCellData(): unknown[][] {
    const cellRanges = this.gridApi.getCellRanges();
    if (!cellRanges || cellRanges.length === 0) return [];

    // 使用 AG Grid 的内置方法获取范围数据
    const data: unknown[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cellRanges.forEach(_range => {
      // 这里需要根据实际的 AG Grid API 来实现
      // 暂时返回空数组，在实际使用时会通过复制功能处理
    });

    return data;
  }
}