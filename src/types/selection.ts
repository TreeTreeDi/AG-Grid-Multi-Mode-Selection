import type { Column, RowNode, CellRange } from 'ag-grid-community';

export type SelectionMode = 'row' | 'column' | 'cell';

export interface SelectionState {
  selectedColumns: Set<string>;
  lastClickedColumn: Column | null;
  lastClickedRow: RowNode | null;
  selectionMode: SelectionMode | null;
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
  COPY_ROW: boolean;
  COPY_COLUMN: boolean;
  VIEW_DETAILS: boolean;
  CLONE_DATA: boolean;
  GENERATE_RESULT_SET: boolean;
}