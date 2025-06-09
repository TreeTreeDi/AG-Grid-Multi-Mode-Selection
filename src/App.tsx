import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  GridReadyEvent,
  GridApi,
  ColumnApi,
  CellClickedEvent,
  GetContextMenuItemsParams,
  MenuItemDef,
  Column,
  RowNode
} from 'ag-grid-community';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import './App.css';

import { CustomSelectionController } from './services/CustomSelectionController';
import { CopyHandler } from './services/CopyHandler';
import { ContextMenuProvider } from './services/ContextMenuProvider';
import type { SelectionContext } from './types/selection';

interface RowData {
  id: number;
  name: string;
  age: number;
  country: string;
  year: number;
  sport: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

const App: React.FC = () => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<SelectionContext | null>(null);

  // 服务实例引用
  const selectionControllerRef = useRef<CustomSelectionController | null>(null);
  const copyHandlerRef = useRef<CopyHandler | null>(null);
  const contextMenuProviderRef = useRef<ContextMenuProvider | null>(null);
  
  // 表格容器引用（用于拖拽事件绑定）
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // 示例数据
  const rowData: RowData[] = useMemo(() => [
    { id: 1, name: '张伟', age: 23, country: '中国', year: 2012, sport: '游泳', gold: 1, silver: 0, bronze: 1, total: 2 },
    { id: 2, name: '李娜', age: 25, country: '中国', year: 2012, sport: '网球', gold: 2, silver: 1, bronze: 0, total: 3 },
    { id: 3, name: '王强', age: 28, country: '中国', year: 2016, sport: '田径', gold: 0, silver: 2, bronze: 1, total: 3 },
    { id: 4, name: 'John Smith', age: 24, country: '美国', year: 2016, sport: '篮球', gold: 1, silver: 0, bronze: 0, total: 1 },
    { id: 5, name: 'Maria Garcia', age: 26, country: '西班牙', year: 2020, sport: '足球', gold: 0, silver: 1, bronze: 2, total: 3 },
    { id: 6, name: 'Hans Mueller', age: 29, country: '德国', year: 2020, sport: '自行车', gold: 2, silver: 0, bronze: 1, total: 3 },
    { id: 7, name: 'Sophie Martin', age: 22, country: '法国', year: 2021, sport: '体操', gold: 1, silver: 2, bronze: 0, total: 3 },
    { id: 8, name: 'Antonio Silva', age: 27, country: '巴西', year: 2021, sport: '排球', gold: 0, silver: 0, bronze: 2, total: 2 },
    { id: 9, name: '田中太郎', age: 30, country: '日本', year: 2021, sport: '柔道', gold: 3, silver: 1, bronze: 0, total: 4 },
    { id: 10, name: 'Emma Wilson', age: 21, country: '英国', year: 2024, sport: '游泳', gold: 1, silver: 1, bronze: 1, total: 3 },
  ], []);

  // 列定义 - 添加行号列
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'rowNumber',
      headerName: '#',
      width: 60,
      pinned: 'left',
      suppressMenu: true,
      sortable: false,
      filter: false,
      resizable: false,
      cellStyle: { 
        textAlign: 'center', 
        backgroundColor: '#f5f5f5',
        cursor: 'pointer',
        userSelect: 'none'
      },
      valueGetter: (params) => {
        if (params.node && params.node.rowIndex !== null) {
          return params.node.rowIndex + 1;
        }
        return '';
      }
    },
    { 
      field: 'name', 
      headerName: '姓名', 
      width: 120,
      cellStyle: { fontWeight: 'bold' }
    },
    { 
      field: 'age', 
      headerName: '年龄', 
      width: 80,
      type: 'numericColumn'
    },
    { 
      field: 'country', 
      headerName: '国家', 
      width: 100
    },
    { 
      field: 'year', 
      headerName: '年份', 
      width: 80,
      type: 'numericColumn'
    },
    { 
      field: 'sport', 
      headerName: '运动项目', 
      width: 120
    },
    { 
      field: 'gold', 
      headerName: '金牌', 
      width: 80,
      type: 'numericColumn',
      cellStyle: { backgroundColor: '#FFD700', color: '#000' }
    },
    { 
      field: 'silver', 
      headerName: '银牌', 
      width: 80,
      type: 'numericColumn',
      cellStyle: { backgroundColor: '#C0C0C0', color: '#000' }
    },
    { 
      field: 'bronze', 
      headerName: '铜牌', 
      width: 80,
      type: 'numericColumn',
      cellStyle: { backgroundColor: '#CD7F32', color: '#fff' }
    },
    { 
      field: 'total', 
      headerName: '总计', 
      width: 80,
      type: 'numericColumn',
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f0f0f0' }
    }
  ], []);

  // 默认列定义
  const defaultColDef: ColDef = useMemo(() => ({
    sortable: false,
    filter: false,
    resizable: true,
    editable: false // 禁用编辑以避免与选择冲突
  }), []);

  // Grid 准备就绪时的回调
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    setColumnApi(params.columnApi);

    // 初始化服务实例
    const selectionController = new CustomSelectionController(params.api, params.columnApi);
    const copyHandler = new CopyHandler(params.api, params.columnApi, selectionController);
    const contextMenuProvider = new ContextMenuProvider(selectionController, copyHandler);

    selectionControllerRef.current = selectionController;
    copyHandlerRef.current = copyHandler;
    contextMenuProviderRef.current = contextMenuProvider;
  }, []);

  // 单元格点击处理
  const onCellClicked = useCallback((params: CellClickedEvent) => {
    console.log('🖱️ 单元格点击事件:', params);
    
    if (selectionControllerRef.current) {
      selectionControllerRef.current.onCellClicked(params);
      updateSelectionInfo();
    }
  }, []);

  // 右键菜单处理
  const getContextMenuItems = useCallback((params: GetContextMenuItemsParams): (string | MenuItemDef)[] => {
    console.log('获取右键菜单项:', params);
    
    if (contextMenuProviderRef.current) {
      return contextMenuProviderRef.current.getContextMenuItems(params);
    }
    return [];
  }, []);

  // 更新选择信息
  const updateSelectionInfo = useCallback(() => {
    if (selectionControllerRef.current) {
      const context = selectionControllerRef.current.getCurrentSelectionContext();
      setSelectionInfo(context);
    }
  }, []);

  // 从鼠标事件获取单元格信息（用于拖拽功能）
  const getCellInfoFromMouseEvent = useCallback((event: MouseEvent): {rowIndex: number, colId: string, node: RowNode, column: Column} | null => {
    if (!gridApi || !columnApi) return null;

    // 从事件目标查找最近的单元格元素
    let target = event.target as HTMLElement;
    while (target && !target.classList.contains('ag-cell')) {
      target = target.parentElement as HTMLElement;
      if (!target || target === document.body) return null;
    }

    if (!target) return null;

    // 从单元格元素获取列ID
    const colId = target.getAttribute('col-id');
    if (!colId) return null;

    // 过滤掉行号列，避免与行选择冲突
    if (colId === 'rowNumber') {
      return null;
    }
    

    // 从单元格元素获取行索引
    let rowElement = target;
    while (rowElement && !rowElement.classList.contains('ag-row')) {
      rowElement = rowElement.parentElement as HTMLElement;
      if (!rowElement || rowElement === document.body) return null;
    }

    if (!rowElement) return null;
    
    const rowIndexAttr = rowElement.getAttribute('row-index');
    if (!rowIndexAttr) return null;
    
    const rowIndex = parseInt(rowIndexAttr, 10);
    if (isNaN(rowIndex)) return null;

    // 获取对应的 RowNode 和 Column 对象
    const rowNode = gridApi.getDisplayedRowAtIndex(rowIndex);
    const column = columnApi.getColumn(colId);

    if (!rowNode || !column) return null;

    return {
      rowIndex,
      colId,
      node: rowNode,
      column
    };
  }, [gridApi, columnApi]);

  // 管理列头点击事件监听器
  useEffect(() => {
    if (columnApi && selectionControllerRef.current) {
      const columns = columnApi.getAllColumns();
      const listeners: Array<{ column: Column; element: HTMLElement; listener: EventListener }> = [];

      columns?.forEach(column => {
        // 通过DOM方式添加事件监听器
        setTimeout(() => {
          const headerElement = document.querySelector(`[col-id="${column.getColId()}"]`) as HTMLElement;
          if (headerElement) {
            const listener: EventListener = (event) => {
              const mouseEvent = event as MouseEvent;
              // 确保是鼠标左键点击
              if (mouseEvent.button === 0) {
                event.preventDefault();
                event.stopPropagation();
                selectionControllerRef.current!.onHeaderClicked(column, mouseEvent);
                updateSelectionInfo();
              }
            };
            
            headerElement.addEventListener('click', listener);
            listeners.push({ column, element: headerElement, listener });
          }
        }, 100); // 稍微延迟以确保DOM已渲染
      });

      return () => {
        // 清理事件监听器
        listeners.forEach(({ element, listener }) => {
          element.removeEventListener('click', listener);
        });
      };
    }
  }, [columnApi, updateSelectionInfo]);

  // 管理拖拽事件监听器
  useEffect(() => {
    if (gridApi && columnApi && selectionControllerRef.current && gridContainerRef.current) {
      const gridContainer = gridContainerRef.current;
      
      const handleGridMouseDown = (event: MouseEvent) => {
        const targetCell = getCellInfoFromMouseEvent(event);
        if (targetCell && selectionControllerRef.current?.onTableMouseDown(event, targetCell)) {
          // 拖拽开始，添加 document 级别的监听器
          const handleDocumentMouseMove = (moveEvent: MouseEvent) => {
            const currentCell = getCellInfoFromMouseEvent(moveEvent);
            selectionControllerRef.current?.onTableMouseMove(currentCell);
          };

          const handleDocumentMouseUp = () => {
            selectionControllerRef.current?.onTableMouseUp();
            updateSelectionInfo();
            // 移除 document 监听器
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
          };

          // 添加 document 监听器
          document.addEventListener('mousemove', handleDocumentMouseMove);
          document.addEventListener('mouseup', handleDocumentMouseUp);
          
          updateSelectionInfo();
        }
      };

      gridContainer.addEventListener('mousedown', handleGridMouseDown);

      return () => {
        gridContainer.removeEventListener('mousedown', handleGridMouseDown);
        // 注意：document 上的动态监听器会在 mouseup 时自动移除
        // 这里只需要移除容器上的监听器即可
      };
    }
  }, [gridApi, columnApi, getCellInfoFromMouseEvent, updateSelectionInfo]);

  // 清除所有选择
  const clearAllSelections = useCallback(() => {
    if (selectionControllerRef.current) {
      selectionControllerRef.current.clearAllSelections();
      updateSelectionInfo();
    }
  }, [updateSelectionInfo]);

  // 复制选中数据
  const copySelectedData = useCallback(async () => {
    if (!copyHandlerRef.current || !selectionInfo) return;

    try {
      switch (selectionInfo.selectionMode) {
        case 'row':
          await copyHandlerRef.current.copyRowData(true);
          break;
        case 'column':
          await copyHandlerRef.current.copyColumnData(true);
          break;
        case 'cell':
          await copyHandlerRef.current.copyCellData();
          break;
        default:
          await copyHandlerRef.current.copyAllData(true);
      }
      console.log('✅ 数据已复制到剪贴板');
    } catch (error) {
      console.error('❌ 复制失败:', error);
    }
  }, [selectionInfo]);

  // 获取选择状态文本
  const getSelectionStatusText = useCallback(() => {
    if (!selectionInfo) return '无选择';

    const { selectionMode, selectedRowCount, selectedColumnCount, cellRangeCount, isSingleCell } = selectionInfo;

    switch (selectionMode) {
      case 'row':
        return `已选择 ${selectedRowCount} 行`;
      case 'column':
        return `已选择 ${selectedColumnCount} 列`;
      case 'cell':
        if (isSingleCell) {
          return '已选择 1 个单元格';
        }
        return `已选择 ${cellRangeCount} 个单元格范围`;
      default:
        return '无选择';
    }
  }, [selectionInfo]);

  return (
    <div className="app-container">
      <div className="header">
        <h1>AG-Grid 自定义多模式选择功能</h1>
        
        <div className="controls">
          <div className="selection-info">
            <span className={`selection-status ${selectionInfo?.selectionMode || 'none'}`}>
              {getSelectionStatusText()}
            </span>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={copySelectedData} 
              className="action-btn copy-btn"
              disabled={!selectionInfo || (!selectionInfo.hasSelectedRows && !selectionInfo.hasSelectedColumns && !selectionInfo.hasSelectedCells)}
            >
              复制选中内容 (Ctrl+C)
            </button>
            
            <button 
              onClick={clearAllSelections} 
              className="action-btn clear-btn"
            >
              清除选择 (Esc)
            </button>
          </div>
        </div>
        
        <div className="instructions">
          <h3>🎯 多模式选择说明:</h3>
          <div className="instruction-grid">
            <div className="instruction-item">
              <h4>🔢 行选择</h4>
              <ul>
                <li>点击行号列选择单行</li>
                <li><kbd>Ctrl</kbd> + 点击行号多选行</li>
                <li><kbd>Shift</kbd> + 点击行号范围选择</li>
              </ul>
            </div>
            
            <div className="instruction-item">
              <h4>📊 列选择</h4>
              <ul>
                <li>点击列头选择单列</li>
                <li><kbd>Ctrl</kbd> + 点击列头多选列</li>
                <li><kbd>Shift</kbd> + 点击列头范围选择</li>
              </ul>
            </div>
            
            <div className="instruction-item">
              <h4>🔳 单元格选择</h4>
              <ul>
                <li>点击数据单元格选择单个单元格</li>
                <li><kbd>Ctrl</kbd> + 点击多选单元格</li>
                <li><kbd>Shift</kbd> + 点击范围选择</li>
                <li>拖拽选择单元格范围</li>
              </ul>
            </div>
            
            <div className="instruction-item">
              <h4>🖱️ 右键菜单</h4>
              <ul>
                <li>根据选择类型显示不同菜单</li>
                <li>支持复制、查看、克隆等操作</li>
                <li>可复制标题、数据或两者结合</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="ag-theme-alpine grid-container" ref={gridContainerRef}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellClicked={onCellClicked}
          getContextMenuItems={getContextMenuItems}
          
          // 自定义选择配置
          rowSelection="multiple"
          enableRangeSelection={true}
          enableRangeHandle={true}
          enableFillHandle={false}
          suppressRowClickSelection={true}  // 禁用默认行选择
          suppressMultiRangeSelection={false}
          
          // 其他配置
          animateRows={true}
          pagination={false}
          suppressMenuHide={false}
          allowContextMenuWithControlKey={true}
          
          // 键盘导航
          navigateToNextCell={(params) => {
            // 自定义键盘导航逻辑
            return params.nextCellPosition || params.previousCellPosition;
          }}
        />
        {/* 调试：禁用 Ctrl-only 触发，确保右键直出菜单 */}
        allowContextMenuWithControlKey={false}
      </div>
    </div>
  );
};

export default App;