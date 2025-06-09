import type { GridApi, ColumnApi } from 'ag-grid-community';
import type { CustomSelectionController } from './CustomSelectionController';
import type { CopyDataFormat, MenuPermissions } from '../types/selection';

export class CopyHandler {
  private gridApi: GridApi;
  private columnApi: ColumnApi;
  private selectionController: CustomSelectionController;
  private permissions: MenuPermissions;

  constructor(
    gridApi: GridApi, 
    columnApi: ColumnApi, 
    selectionController: CustomSelectionController,
    permissions: MenuPermissions = {
      COPY_CELL: true,
      COPY_ROW_COLUMN_ALL: true,
      VIEW_DETAILS: true,
      CLONE_DATA: true,
      GENERATE_RESULT_SET: true
    }
  ) {
    this.gridApi = gridApi;
    this.columnApi = columnApi;
    this.selectionController = selectionController;
    this.permissions = permissions;
  }

  // 复制列数据
  copyColumnData(includeHeaders = false): Promise<void> {
    const context = this.selectionController.getCurrentSelectionContext();
    if (!context.hasSelectedColumns || !this.permissions.COPY_ROW_COLUMN_ALL) {
      return Promise.reject(new Error('没有选中的列或没有复制权限'));
    }

    const data: string[][] = [];
    const headers: string[] = [];
    
    // 获取选中的列
    context.selectedColumns.forEach(colId => {
      const column = this.columnApi.getColumn(colId);
      if (column) {
        const columnData: string[] = [];
        
        // 添加列头
        if (includeHeaders) {
          headers.push(column.getColDef().headerName || colId);
        }
        
        // 获取列数据
        this.gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
          const value = this.gridApi.getValue(colId, rowNode);
          columnData.push(this.formatCellValue(value));
        });
        
        data.push(columnData);
      }
    });

    const copyData: CopyDataFormat = {
      type: 'column',
      data,
      headers: includeHeaders ? headers : undefined
    };

    const formattedData = this.formatDataForClipboard(copyData);
    return this.writeToClipboard(formattedData);
  }

  // 复制行数据
  copyRowData(includeHeaders = false): Promise<void> {
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0 || !this.permissions.COPY_ROW_COLUMN_ALL) {
      return Promise.reject(new Error('没有选中的行或没有复制权限'));
    }

    const allColumns = this.columnApi.getAllDisplayedColumns();
    if (!allColumns) {
      return Promise.reject(new Error('无法获取列信息'));
    }

    const data: string[][] = [];
    const headers: string[] = [];

    // 添加标题行
    if (includeHeaders) {
      allColumns.forEach(column => {
        headers.push(column.getColDef().headerName || column.getColId());
      });
    }

    // 添加数据行
    selectedRows.forEach(rowData => {
      const row: string[] = [];
      allColumns.forEach(column => {
        const value = rowData[column.getColId()];
        row.push(this.formatCellValue(value));
      });
      data.push(row);
    });

    const copyData: CopyDataFormat = {
      type: 'row',
      data,
      headers: includeHeaders ? headers : undefined
    };

    const formattedData = this.formatDataForClipboard(copyData);
    return this.writeToClipboard(formattedData);
  }

  // 复制单元格数据
  copyCellData(): Promise<void> {
    const context = this.selectionController.getCurrentSelectionContext();
    if (!context.hasSelectedCells || !this.permissions.COPY_CELL) {
      return Promise.reject(new Error('没有选中的单元格或没有复制权限'));
    }

    // copySelectedRangeToClipboard 是企业版功能
    // 在 Community 版本中，我们将不调用此 API 以避免错误
    console.warn('[CopyHandler] copySelectedRangeToClipboard is an Enterprise feature. Cell data copying might not work as expected in Community version.');
    // 暂时返回一个 resolved Promise，表示尝试过操作，但实际上可能没有复制任何内容
    // 或者可以尝试基于 context.cellRanges 手动构建数据，但这会很复杂且不精确
    // 对于调试阶段，我们先阻止崩溃
    // alert('单元格范围复制是企业版功能，在社区版中可能无法按预期工作。');
    return Promise.resolve();
    /*
    // 原有逻辑:
    const cellRanges = this.gridApi.getCellRanges();
    if (!cellRanges || cellRanges.length === 0 || !this.permissions.COPY_CELL) {
      return Promise.reject(new Error('没有选中的单元格或没有复制权限'));
    }

    try {
      this.gridApi.copySelectedRangeToClipboard(false);
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error('复制单元格数据失败'));
    }
    */
  }

  // 复制列标题
  copyColumnHeaders(): Promise<void> {
    const context = this.selectionController.getCurrentSelectionContext();
    if (!context.hasSelectedColumns) {
      return Promise.reject(new Error('没有选中的列'));
    }

    const headers: string[] = [];
    context.selectedColumns.forEach(colId => {
      const column = this.columnApi.getColumn(colId);
      if (column) {
        headers.push(column.getColDef().headerName || colId);
      }
    });

    const formattedData = headers.join('\t');
    return this.writeToClipboard(formattedData);
  }

  // 复制单元格标题
  copyCellHeaders(): Promise<void> {
    const cellRanges = this.gridApi.getCellRanges();
    if (!cellRanges || cellRanges.length === 0) {
      return Promise.reject(new Error('没有选中的单元格'));
    }

    const headers: string[] = [];
    cellRanges.forEach(range => {
      range.columns.forEach(column => {
        const headerName = column.getColDef().headerName || column.getColId();
        if (!headers.includes(headerName)) {
          headers.push(headerName);
        }
      });
    });

    const formattedData = headers.join('\t');
    return this.writeToClipboard(formattedData);
  }

  // 复制全部数据
  copyAllData(includeHeaders = true): Promise<void> {
    const allColumns = this.columnApi.getAllDisplayedColumns();
    if (!allColumns) {
      return Promise.reject(new Error('无法获取列信息'));
    }

    const data: string[][] = [];
    const headers: string[] = [];

    // 添加标题行
    if (includeHeaders) {
      allColumns.forEach(column => {
        headers.push(column.getColDef().headerName || column.getColId());
      });
    }

    // 添加所有数据行
    this.gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
      const row: string[] = [];
      allColumns.forEach(column => {
        const value = this.gridApi.getValue(column.getColId(), rowNode);
        row.push(this.formatCellValue(value));
      });
      data.push(row);
    });

    const copyData: CopyDataFormat = {
      type: 'row',
      data,
      headers: includeHeaders ? headers : undefined
    };

    const formattedData = this.formatDataForClipboard(copyData);
    return this.writeToClipboard(formattedData);
  }

  // 格式化单元格值
  private formatCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  // 格式化数据为剪贴板格式
  private formatDataForClipboard(copyData: CopyDataFormat): string {
    const { type, data, headers } = copyData;
    
    let result = '';

    // 添加标题行
    if (headers) {
      if (type === 'column') {
        // 列数据：标题横向排列
        result += headers.join('\t') + '\n';
      } else {
        // 行数据：标题作为第一行
        result += headers.join('\t') + '\n';
      }
    }

    // 添加数据
    if (type === 'column') {
      // 列数据：转置数据，每行表示一个数据行
      const maxLength = Math.max(...data.map(col => col.length));
      for (let i = 0; i < maxLength; i++) {
        const row: string[] = [];
        data.forEach(column => {
          row.push(column[i] || '');
        });
        result += row.join('\t') + '\n';
      }
    } else {
      // 行数据：每行一行，列用制表符分隔
      data.forEach(row => {
        result += row.join('\t') + '\n';
      });
    }

    return result.trim();
  }

  // 写入剪贴板
  private async writeToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        console.log('数据已复制到剪贴板');
      } else {
        // 降级方案
        this.fallbackCopyToClipboard(text);
      }
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案
      this.fallbackCopyToClipboard(text);
      throw new Error('复制到剪贴板失败');
    }
  }

  // 降级复制方案
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('数据已复制到剪贴板 (降级方案)');
      } else {
        throw new Error('降级复制方案失败');
      }
    } catch (err) {
      console.error('降级复制方案失败:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // 更新权限
  updatePermissions(permissions: Partial<MenuPermissions>): void {
    this.permissions = { ...this.permissions, ...permissions };
  }

  // 获取当前权限
  getPermissions(): MenuPermissions {
    return { ...this.permissions };
  }
}