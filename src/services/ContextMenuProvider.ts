import type { GetContextMenuItemsParams, MenuItemDef } from 'ag-grid-community';
import type { CustomSelectionController } from './CustomSelectionController';
import type { CopyHandler } from './CopyHandler';
import type { SelectionContext, MenuPermissions, ContextMenuArea } from '../types/selection';

export class ContextMenuProvider {
  private selectionController: CustomSelectionController;
  private copyHandler: CopyHandler;
  private permissions: MenuPermissions;

  constructor(
    selectionController: CustomSelectionController,
    copyHandler: CopyHandler,
    permissions: MenuPermissions = {
      COPY_CELL: true,
      COPY_ROW_COLUMN_ALL: true,
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
  getContextMenuItems = (params: GetContextMenuItemsParams): (string | MenuItemDef)[] => {
    const context = this.selectionController.getCurrentSelectionContext();
    const clickArea = this.determineClickArea(params, context);
    
    let menuItems: (string | MenuItemDef)[] = [];

    // 根据点击区域和选择状态生成菜单项
    switch (clickArea) {
      case 'column-header':
        menuItems = this.getColumnHeaderMenuItems();
        break;
      case 'row-area':
        menuItems = this.getRowAreaMenuItems(context);
        break;
      case 'single-cell':
        menuItems = this.getSingleCellMenuItems();
        break;
      case 'multiple-cells':
        menuItems = this.getMultipleCellsMenuItems();
        break;
      default:
        menuItems = this.getDefaultMenuItems();
        break;
    }

    // 添加分隔符和通用菜单项
    if (menuItems.length > 0) {
      menuItems.push('separator');
    }
    menuItems.push(...this.getCommonMenuItems());

    return menuItems;
  };

  // 确定右键点击区域
  private determineClickArea(params: GetContextMenuItemsParams, context: SelectionContext): ContextMenuArea {
    console.log('右键菜单参数:', params);
    console.log('选择上下文:', context);

    // 如果点击了列头
    if (params.column && !params.node) {
      console.log('检测到列头点击');
      return 'column-header';
    }

    // 如果点击了行区域（行号列或选择框列）
    if (params.node && params.column) {
      const colId = params.column.getColId();
      console.log('点击的列ID:', colId);
      
      if (colId === 'rowNumber' ||
          params.column.getColDef().checkboxSelection ||
          params.column.getColDef().headerCheckboxSelection) {
        console.log('检测到行区域点击');
        return 'row-area';
      }
    }

    // 如果有单元格选择
    if (context.hasSelectedCells) {
      console.log('检测到单元格选择');
      // 根据选择的单元格数量判断
      if (context.isSingleCell) {
        console.log('单个单元格选择');
        return 'single-cell';
      } else {
        console.log('多个单元格选择');
        return 'multiple-cells';
      }
    }

    // 如果有行选择但不是点击行号列，也当作行区域处理
    if (context.hasSelectedRows) {
      console.log('检测到行选择');
      return 'row-area';
    }

    // 如果点击了普通单元格但没有选择，默认当作单元格处理
    if (params.node && params.column) {
      console.log('检测到普通单元格点击，默认为单元格');
      return 'single-cell';
    }

    console.log('未知点击区域');
    return 'unknown';
  }

  // 列头右键菜单
  private getColumnHeaderMenuItems(): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    // 复制标题
    items.push({
      name: '复制标题',
      action: () => this.handleMenuAction('复制标题'),
      icon: '<span>📋</span>'
    });

    // 复制列数据（受权限控制）
    items.push({
      name: '复制列数据',
      action: () => this.handleMenuAction('复制列数据'),
      icon: '<span>📊</span>',
      disabled: !this.permissions.COPY_ROW_COLUMN_ALL
    });

    // 结果集生成
    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.handleMenuAction('结果集生成'),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 行区域右键菜单
  private getRowAreaMenuItems(context: SelectionContext): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    // 查看（原查看单行，改名为查看）
    if (this.permissions.VIEW_DETAILS && context.selectedRowCount === 1) {
      items.push({
        name: '查看',
        action: () => this.handleMenuAction('查看'),
        icon: '<span>👁️</span>'
      });
    }

    // 复制（原复制单行/多行，改名为复制）
    const rowText = context.selectedRowCount === 1 ? '单行' : `多行(${context.selectedRowCount}行)`;
    items.push({
      name: '复制',
      action: () => this.handleMenuAction(`复制${rowText}`),
      icon: '<span>📋</span>'
    });

    // 复制全部
    items.push({
      name: '复制全部',
      action: () => this.handleMenuAction('复制全部'),
      icon: '<span>📈</span>'
    });

    // 复制标题（只保留复制全部标题功能，不需要有二级菜单）
    items.push({
      name: '复制标题',
      action: () => this.handleMenuAction('复制标题'),
      icon: '<span>🏷️</span>'
    });

    // 与标题一起复制
    items.push({
      name: '与标题一起复制',
      action: () => this.handleMenuAction('与标题一起复制'),
      icon: '<span>📊</span>'
    });

    // 克隆（原克隆单行/多行，改名为克隆）
    if (this.permissions.CLONE_DATA) {
      items.push({
        name: '克隆',
        action: () => this.handleMenuAction('克隆'),
        icon: '<span>🔄</span>'
      });
    }

    // 结果集生成
    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.handleMenuAction('结果集生成'),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 单个单元格右键菜单
  private getSingleCellMenuItems(): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    // 查看单元格
    if (this.permissions.VIEW_DETAILS) {
      items.push({
        name: '查看单元格',
        action: () => this.handleMenuAction('查看单元格'),
        icon: '<span>👁️</span>'
      });
    }

    // 复制（原复制单元格，更名为复制）
    if (this.permissions.COPY_CELL) {
      items.push({
        name: '复制',
        action: () => this.handleMenuAction('复制单元格'),
        icon: '<span>📋</span>'
      });
    }

    // 复制全部
    items.push({
      name: '复制全部',
      action: () => this.handleMenuAction('复制全部'),
      icon: '<span>📈</span>'
    });

    // 复制标题
    items.push({
      name: '复制标题',
      action: () => this.handleMenuAction('复制标题'),
      icon: '<span>🏷️</span>'
    });

    // 与标题一起复制
    items.push({
      name: '与标题一起复制',
      action: () => this.handleMenuAction('与标题一起复制'),
      icon: '<span>📊</span>'
    });

    // 结果集生成
    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.handleMenuAction('结果集生成'),
        icon: '<span>⚙️</span>'
      });
    }

    return items;
  }

  // 多个单元格右键菜单
  private getMultipleCellsMenuItems(): MenuItemDef[] {
    const items: MenuItemDef[] = [];

    // 复制（原复制单元格，更名为复制）
    if (this.permissions.COPY_CELL) {
      items.push({
        name: '复制',
        action: () => this.handleMenuAction('复制多单元格'),
        icon: '<span>📋</span>'
      });
    }

    // 复制全部
    items.push({
      name: '复制全部',
      action: () => this.handleMenuAction('复制全部'),
      icon: '<span>📈</span>'
    });

    // 复制标题（无二级菜单，复制标题就是复制当前选中单元格的标题）
    items.push({
      name: '复制标题',
      action: () => this.handleMenuAction('复制选中单元格标题'),
      icon: '<span>🏷️</span>'
    });

    // 与标题一起复制
    items.push({
      name: '与标题一起复制',
      action: () => this.handleMenuAction('与标题一起复制'),
      icon: '<span>📊</span>'
    });

    // 结果集生成
    if (this.permissions.GENERATE_RESULT_SET) {
      items.push({
        name: '结果集生成',
        action: () => this.handleMenuAction('结果集生成'),
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
        action: () => this.handleMenuAction('复制全部'),
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

  // 处理菜单操作（占位符实现）
  private handleMenuAction(actionName: string): void {
    console.log(`菜单操作: ${actionName}`);
    this.showSuccessMessage(`${actionName} 功能暂未实现`);
  }

  // 清除所有选择
  private clearAllSelections(): void {
    this.selectionController.clearAllSelections();
    this.showSuccessMessage('已清除所有选择');
  }

  // 刷新表格
  private refreshGrid(): void {
    this.showSuccessMessage('表格已刷新');
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