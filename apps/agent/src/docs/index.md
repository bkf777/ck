---
title: 介绍
description: 介绍
type: 0
group: 💡 概念
menuName: 介绍
icon:
order: 8
---

## amis 简介

amis 是一个低代码前端框架，使用 JSON 配置来生成页面。它提供了 120+ 内置组件，包括表单、表格、图表、富文本编辑器等，可以快速构建中后台管理界面。

## AI 快速索引

本文档旨在帮助 AI 助手根据用户需求快速定位到具体的 amis 文档。

### 需求类型 → 文档映射

#### 页面结构类

- 创建页面 → `components/page.md`
- 表格/列表页面 → `components/crud.md`, `components/table.md`
- 表单页面 → `components/form/`
- 弹窗/抽屉 → `components/dialog.md`, `components/drawer.md`
- 多标签页 → `components/tabs.md`
- 向导流程 → `components/wizard.md`
- 卡片展示 → `components/card.md`, `components/cards.md`
- 导航菜单 → `components/nav.md`

#### 数据交互类

- 数据获取和提交 → `concepts/schema.md`
- 数据映射和转换 → `concepts/data-mapping.md`
- 表达式计算 → `concepts/expression.md`
- 数据联动 → `concepts/linkage.md`
- 数据范围和链 → `concepts/datascope-and-datachain.md`
- API 接口定义 → `types/api.md`

#### 交互行为类

- 按钮和操作 → `concepts/action.md`, `components/button.md`
- 事件处理 → `concepts/event-action.md`
- 表单验证 → `components/form/` (各表单项的验证配置)
- 批量操作 → `components/crud.md` (bulkActions 配置)
- 快速编辑 → `components/crud.md` (quickSave 配置)

#### 表单组件类

- 文本输入 → `components/form/input-text.md`
- 数字输入 → `components/form/input-number.md`
- 下拉选择 → `components/form/select.md`
- 日期选择 → `components/form/input-date.md`, `components/form/input-datetime.md`
- 文件上传 → `components/form/input-file.md`
- 富文本编辑 → `components/form/input-rich-text.md`
- 代码编辑 → `components/form/input-code.md`
- 复选框/单选框 → `components/form/checkbox.md`, `components/form/radios.md`
- 开关按钮 → `components/form/switch.md`

#### 样式和布局类

- 自定义样式 → `style/index.md`
- CSS 变量 → `style/css-vars.md`
- 响应式设计 → `style/responsive-design.md`
- 状态样式 → `style/state.md`
- 布局容器 → `components/flex.md`, `components/grid.md`, `components/hbox.md`, `components/container.md`
- 分隔线 → `components/divider.md`

#### 数据展示类

- 文本展示 → `components/tpl.md`
- 图片展示 → `components/image.md`, `components/images.md`
- 视频播放 → `components/video.md`
- 图表展示 → `components/chart.md`
- 代码高亮 → `components/code.md`
- JSON 展示 → `components/json.md`
- Markdown → `components/markdown.md`
- 进度条 → `components/progress.md`
- 状态标签 → `components/status.md`, `components/badge.md`

#### 提示和反馈类

- 提示框 → `components/alert.md`
- 消息提示 → `components/toast.md`
- 弹出提示 → `components/popover.md`
- 抽屉 → `components/drawer.md`
- 对话框 → `components/dialog.md`

#### 扩展和进阶

- 自定义组件 → `extend/internal.md`, `extend/custom-react.md`
- 自定义 SDK → `extend/custom-sdk.md`
- 移动端适配 → `extend/mobile.md`
- 国际化 → `extend/i18n.md`
- 可视化编辑器 → `extend/editor.md`
- 插件扩展 → `extend/addon.md`
- 调试工具 → `extend/debug.md`
- 追踪统计 → `extend/tracker.md`
- 贡献指南 → `extend/contribute.md`

#### 常见问题

- 快速入门 → `start/getting-started.md`
- 常见问题 → `start/faq.md`
- 更新日志 → `start/changelog.md`

### 关键词搜索建议

当用户提到以下关键词时，建议优先阅读对应文档：

- **"表单"** → `components/form/` 目录
- **"表格/列表/CRUD"** → `components/crud.md`, `components/table.md`
- **"API/接口/数据请求"** → `concepts/schema.md`, `types/api.md`
- **"验证/校验"** → `components/form/` 各表单项文档
- **"联动/关联/依赖"** → `concepts/linkage.md`
- **"模板/格式化"** → `concepts/template.md`
- **"样式/主题/颜色"** → `style/index.md`, `style/css-vars.md`
- **"响应式/手机/移动端"** → `style/responsive-design.md`, `extend/mobile.md`
- **"自定义组件/扩展"** → `extend/internal.md`, `extend/custom-react.md`
- **"事件/动作"** → `concepts/action.md`, `concepts/event-action.md`
- **"表达式/计算"** → `concepts/expression.md`
- **"数据映射/转换"** → `concepts/data-mapping.md`

### 文档读取策略

1. **优先级顺序**：概念文档 → 组件文档 → 扩展文档

   - 先理解 amis 的核心概念（schema、data-mapping、expression）
   - 再查找具体组件的使用方法
   - 最后查看扩展和高级功能

2. **组合使用**：

   - 先了解 `concepts/schema.md` 的基础结构
   - 再查具体组件的配置选项
   - 参考组件文档中的示例代码

3. **跨章节关联**：

   - 表单组件文档会引用 `concepts/form.md` 中的通用配置
   - 事件处理会引用 `concepts/action.md` 和 `concepts/event-action.md`
   - 数据相关功能会引用 `concepts/data-mapping.md` 和 `concepts/expression.md`

4. **类型定义参考**：
   - 了解完整的数据结构和接口定义，查看 `types/` 目录
   - 组件的 props 和 schema 定义参考 `types/definitions.md`
   - 类名相关的类型定义参考 `types/classname.md`

## 让我们马上开始吧

点击页面底部的下一篇，继续阅读文档。
