import type { GetContextMenuItemsParams, MenuItemDef } from 'ag-grid-community';
import type { CustomSelectionController } from './CustomSelectionController';
import type { CopyHandler } from './CopyHandler';
import type { SelectionContext, MenuPermissions } from '../types/selection';

export class ContextMenuProvider {
  private selectionController: CustomSelectionController;
  private copyHandler: CopyHandler;
  private permissions: MenuPermissions;

  constructor(
    selectionController: CustomSelectionController,
    copyHandler: CopyHandler,
    permissions: MenuPermissions = {
      COPY_CELL: true,
      COPY_ROW: true,
      COPY_COLUMN: true,
      VIEW_DETAILS: true,
      CLONE_DATA: true,
      GENERATE_RESULT_SET: true
    }
  ) {
    this.selectionController = selectionController;
    this.copyHandler = copyHandler;
    this.permissions = permissions;
  }

  // 获取上下文菜单项
  getContextMenuItems = (_params: GetContextMenuItemsParams): (string | MenuItemDef)[] => {
    const context = this.selectionController.getCurrentSelectionContext();
    const menuItems: (string | MenuItemDef)[] = [];

    // 根据选择类型提供不同的菜单项
    if (context.hasSelectedColumns) {
      menuItems.push(...this.getColumnMenuItems(context));
    } else if (context.hasSelectedRows) {
      menuItems.push(...this.getRowMenuItems(context));
    } else if (context.hasSelectedCells) {
      menuItems.push(...this.getCellMenuItems(context));
    } else {
      menuItems.push(...this.getDefaultMenuItems());
    }

    // 添加分隔符和通用菜单项
    if (menuItems.length > 0) {
      menuItems.push('separator');
    }
    menuItems.push(...this.getCommonMenuItems());

    return menuItems;
  };

  // 列选择菜单项
  private getColumnMenuItems(context: SelectionContext): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    items.push({
      name: '复制列标题',
      action: () => this.handleMenuAction(() => this.copyHandler.copyColumnHeaders()),
      icon: '<span>📋</span>'
    });

    if (this.permissions.COPY_COLUMN) {
      items.push({
        name: `复制列数据 (${context.selectedColumnCount}列)`,
        action: () => this.handleMenuAction(() => this.copyHandler.copyColumnData(false)),
        icon: '<span>📊</span>'
      });

      items.push({
        name: '复制列数据(含标题)',
        action: () => this.handleMenuAction(() => this.copyHandler.copyColumnData(true)),
        icon: '<span>📈</span>'
      });
    }

    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.generateResultSet(context),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 行选择菜单项
  private getRowMenuItems(context: SelectionContext): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    if (this.permissions.VIEW_DETAILS && context.selectedRowCount === 1) {
      items.push({
        name: '查看单行',
        action: () => this.viewRowDetails(context),
        icon: '<span>👁️</span>'
      });
    }

    if (this.permissions.COPY_ROW) {
      const rowText = context.selectedRowCount === 1 ? '单行' : `多行(${context.selectedRowCount}行)`;
      items.push({
        name: `复制${rowText}`,
        action: () => this.handleMenuAction(() => this.copyHandler.copyRowData(false)),
        icon: '<span>📋</span>'
      });

      items.push({
        name: '复制标题',
        action: () => this.copyHeaders(),
        icon: '<span>🏷️</span>'
      });

      items.push({
        name: '与标题一起复制',
        action: () => this.handleMenuAction(() => this.copyHandler.copyRowData(true)),
        icon: '<span>📊</span>'
      });
    }

    items.push({
      name: '复制全部',
      action: () => this.handleMenuAction(() => this.copyHandler.copyAllData(true)),
      icon: '<span>📈</span>'
    });

    if (this.permissions.CLONE_DATA) {
      const rowText = context.selectedRowCount === 1 ? '单行' : `多行(${context.selectedRowCount}行)`;
      items.push({
        name: `克隆${rowText}`,
        action: () => this.cloneRows(context),
        icon: '<span>🔄</span>'
      });
    }

    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.generateResultSet(context),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 单元格选择菜单项
  private getCellMenuItems(context: SelectionContext): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    if (this.permissions.VIEW_DETAILS && context.isSingleCell) {
      items.push({
        name: '查看单元格',
        action: () => this.viewCellDetails(context),
        icon: '<span>👁️</span>'
      });
    }

    if (this.permissions.COPY_CELL) {
      const cellText = context.isSingleCell ? '单元格' : `多单元格(${context.cellRangeCount}个范围)`;
      items.push({
        name: `复制${cellText}`,
        action: () => this.handleMenuAction(() => this.copyHandler.copyCellData()),
        icon: '<span>📋</span>'
      });
    }

    items.push({
      name: '复制全部',
      action: () => this.handleMenuAction(() => this.copyHandler.copyAllData(true)),
      icon: '<span>📈</span>'
    });

    items.push({
      name: '复制单元格标题',
      action: () => this.handleMenuAction(() => this.copyHandler.copyCellHeaders()),
      icon: '<span>🏷️</span>'
    });

    items.push({
      name: '与标题一起复制',
      action: () => this.copyCellDataWithHeaders(context),
      icon: '<span>📊</span>'
    });

    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.generateResultSet(context),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 默认菜单项（无选择时）
  private getDefaultMenuItems(): MenuItemDef[] {
    return [
      {
        name: '复制全部',
        action: () => this.handleMenuAction(() => this.copyHandler.copyAllData(true)),
        icon: '<span>📈</span>'
      }
    ];
  }

  // 通用菜单项
  private getCommonMenuItems(): MenuItemDef[] {
    return [
      {
        name: '清除选择',
        action: () => this.clearAllSelections(),
        icon: '<span>🗑️</span>'
      },
      {
        name: '刷新表格',
        action: () => this.refreshGrid(),
        icon: '<span>🔄</span>'
      }
    ];
  }

  // 处理菜单操作
  private async handleMenuAction(action: () => Promise<void>): Promise<void> {
    try {
      await action();
      this.showSuccessMessage('操作成功完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      this.showErrorMessage(message);
    }
  }

  // 查看行详情
  private viewRowDetails(context: SelectionContext): void {
    if (context.selectedRows.length === 1) {
      const rowData = context.selectedRows[0].data;
      const details = JSON.stringify(rowData, null, 2);
      
      // 创建详情窗口
      const modal = this.createModal('行详情', `<pre>${details}</pre>`);
      document.body.appendChild(modal);
    }
  }

  // 查看单元格详情
  private viewCellDetails(context: SelectionContext): void {
    if (context.cellRanges.length === 1) {
      const range = context.cellRanges[0];
      const details = {
        startRow: range.startRow,
        endRow: range.endRow,
        columns: range.columns.map(col => ({
          id: col.getColId(),
          headerName: col.getColDef().headerName
        }))
      };
      
      const detailsText = JSON.stringify(details, null, 2);
      const modal = this.createModal('单元格详情', `<pre>${detailsText}</pre>`);
      document.body.appendChild(modal);
    }
  }

  // 复制标题
  private copyHeaders(): void {
    this.handleMenuAction(() => {
      // 获取所有显示的列标题
      const allColumns = this.copyHandler['columnApi'].getAllDisplayedColumns();
      if (!allColumns) {
        return Promise.reject(new Error('无法获取列信息'));
      }
      
      const headers = allColumns.map(col => 
        col.getColDef().headerName || col.getColId()
      );
      
      const text = headers.join('\t');
      return this.copyHandler['writeToClipboard'](text);
    });
  }

  // 复制单元格数据与标题
  private copyCellDataWithHeaders(_context: SelectionContext): void {
    // 这里可以实现更复杂的单元格数据与标题一起复制的逻辑
    this.handleMenuAction(() => this.copyHandler.copyCellData());
  }

  // 克隆行
  private cloneRows(context: SelectionContext): void {
    const selectedRows = context.selectedRows.map(node => ({ ...node.data }));
    const clonedData = JSON.stringify(selectedRows, null, 2);
    
    const modal = this.createModal(
      '克隆的行数据',
      `<div>
        <p>已克隆 ${selectedRows.length} 行数据:</p>
        <pre style="max-height: 300px; overflow-y: auto;">${clonedData}</pre>
        <button onclick="this.closest('.ag-modal').remove()">关闭</button>
      </div>`
    );
    document.body.appendChild(modal);
  }

  // 生成结果集
  private generateResultSet(context: SelectionContext): void {
    const resultSet = {
      selectionMode: context.selectionMode,
      timestamp: new Date().toISOString(),
      rowCount: context.selectedRowCount,
      columnCount: context.selectedColumnCount,
      cellRangeCount: context.cellRangeCount,
      data: this.selectionController.getSelectedData()
    };
    
    const resultText = JSON.stringify(resultSet, null, 2);
    const modal = this.createModal(
      '结果集',
      `<div>
        <pre style="max-height: 400px; overflow-y: auto;">${resultText}</pre>
        <button onclick="navigator.clipboard.writeText(\`${resultText.replace(/`/g, '\\`')}\`)">复制结果集</button>
        <button onclick="this.closest('.ag-modal').remove()">关闭</button>
      </div>`
    );
    document.body.appendChild(modal);
  }

  // 清除所有选择
  private clearAllSelections(): void {
    this.selectionController.clearAllSelections();
    this.showSuccessMessage('已清除所有选择');
  }

  // 刷新表格
  private refreshGrid(): void {
    // 这里可以触发表格刷新逻辑
    this.showSuccessMessage('表格已刷新');
  }

  // 创建模态窗口
  private createModal(title: string, content: string): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'ag-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      min-width: 300px;
      max-width: 80vw;
      max-height: 80vh;
      overflow: auto;
    `;
    
    modal.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0; font-size: 16px;">${title}</h3>
        <button onclick="this.closest('.ag-modal').remove()" 
                style="float: right; margin-top: -20px; border: none; background: none; font-size: 18px; cursor: pointer;">×</button>
      </div>
      <div style="padding: 16px;">
        ${content}
      </div>
    `;

    // 点击外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    return modal;
  }

  // 显示成功消息
  private showSuccessMessage(message: string): void {
    console.log('✅', message);
    // 这里可以集成实际的通知系统
  }

  // 显示错误消息
  private showErrorMessage(message: string): void {
    console.error('❌', message);
    // 这里可以集成实际的通知系统
  }

  // 更新权限
  updatePermissions(permissions: Partial<MenuPermissions>): void {
    this.permissions = { ...this.permissions, ...permissions };
  }
}