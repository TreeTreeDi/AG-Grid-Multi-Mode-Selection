import type { Column, RowNode, CellRange } from 'ag-grid-community';

export type SelectionMode = 'row' | 'column' | 'cell';

export interface SelectionState {
  selectedColumns: Set<string>;
  lastClickedColumn: Column | null;
  lastClickedRow: RowNode | null;
  selectionMode: SelectionMode | null;
  // 单元格选择相关状态
  selectedCellIds: Set<string>; // 存储 "rowIndex_colId" 格式的单元格ID
  lastClickedCellPosition: { rowIndex: number; colId: string } | null;
  shiftSelectionAnchorCell: { rowIndex: number; colId: string } | null; // Shift范围选择的固定起点
  dragStartState: {
    startRowIndex: number;
    startColId: string;
    dragging: boolean;
  } | null;
}

export interface SelectionContext {
  selectionMode: SelectionMode | null;
  hasSelectedRows: boolean;
  hasSelectedColumns: boolean;
  hasSelectedCells: boolean;
  selectedRowCount: number;
  selectedColumnCount: number;
  cellRangeCount: number;
  selectedRows: RowNode[];
  selectedColumns: string[];
  cellRanges: CellRange[];
  isSingleCell: boolean;
}

export interface CopyDataFormat {
  type: 'row' | 'column' | 'cell';
  data: string[][];
  headers?: string[];
}

export interface MenuPermissions {
  COPY_CELL: boolean;
  COPY_ROW_COLUMN_ALL: boolean; // 原 COPY_ROW 和 COPY_COLUMN 合并，控制复制单行/多行/列/全部
  VIEW_DETAILS: boolean;
  CLONE_DATA: boolean;
  GENERATE_RESULT_SET: boolean;
}

// 右键点击区域类型
export type ContextMenuArea = 'column-header' | 'row-area' | 'single-cell' | 'multiple-cells' | 'unknown';

// 扩展选择上下文，添加右键点击区域信息
export interface ExtendedSelectionContext extends SelectionContext {
  clickArea: ContextMenuArea;
}