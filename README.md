# ag-grid-mini-select

AG-Grid 多模式选择演示项目

本项目基于 AG Grid Community 版本，演示了如何实现自定义的多模式选择（行、列、单元格、范围）功能，并支持复制、清除、右键菜单等常用操作。

## 功能特性
- 支持行、列、单元格的单选、多选、范围选择（Shift/Ctrl/拖拽）
- 支持自定义列头点击事件，实现列选择
- 支持右键菜单，按选择类型显示不同菜单项
- 支持复制选中内容到剪贴板
- 支持清除所有选择
- 兼容 AG Grid Community 版本（不依赖企业版 API）

## 快速开始

1. 安装依赖：

```bash
pnpm install
```

2. 启动开发服务器：

```bash
pnpm dev
```

3. 访问页面：

浏览器打开 http://localhost:5173

## 主要文件说明
- `src/App.tsx`：主页面，包含表格渲染与交互逻辑
- `src/services/CustomSelectionController.ts`：自定义选择控制器，核心多模式选择逻辑
- `src/services/CopyHandler.ts`：复制功能实现
- `src/services/ContextMenuProvider.ts`：右键菜单实现
- `src/types/selection.ts`：选择相关类型定义

## 选择操作说明
- **行选择**：点击行号列，Ctrl 多选，Shift 范围多选
- **列选择**：点击列头，Ctrl 多选，Shift 范围多选
- **单元格选择**：点击单元格，Ctrl 多选，Shift 范围多选，支持拖拽
- **右键菜单**：根据选择类型显示不同菜单，支持复制等操作

## 自定义样式
选中后的高亮样式由 AG Grid 主题（如 `ag-theme-alpine`）控制。可通过覆盖 CSS 类（如 `.ag-row-selected`、`.ag-cell-range-selected`）自定义选中效果。

## 适用场景
- 需要 Excel 类似多模式选择体验的表格应用
- 需要自定义选择、复制、右键菜单等高级交互的 React/AG Grid 项目

---

如有问题或建议，欢迎提 issue 或 PR！

---
