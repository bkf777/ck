"use client";

import { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";

// ... imports
import { CopilotSidebar, CopilotChat } from "@copilotkit/react-ui";
import { Sun, Moon, Monitor, CheckIcon, ClockIcon } from "lucide-react";
import {
  useCoAgent,
  useCoAgentStateRender,
  useCopilotReadable,
  useFrontendTool,
} from "@copilotkit/react-core";
import { type AmisAgentState } from "../../../../agent/src/amis-agent/state";
import {
  type Task,
  type ExecutionEvent,
} from "../../../../agent/src/amis-agent/types";

// 动态导入 qiankun 避免 SSR 报错
let loadMicroApp: any;

import { useAmisSdk } from "../../hooks/use-amis-sdk";

const DEFAULT_SCHEMA = {
  type: "page",
  title: "AMIS Agent 使用教程",
  className:
    "bg-white dark:bg-slate-950 font-sans h-full transition-colors duration-300",
  cssVars: {
    "--primary": "#6366f1",
    "--primary-onHover": "#4f46e5",
    "--text-color": "#1f2937",
  },
  css: `
    html.dark .cxd-Page { background-color: transparent !important; color: #f8fafc !important; }
    html.dark .cxd-Card { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-Panel { background-color: #1e293b !important; border-color: #334155 !important; }
    html.dark .cxd-Panel-title { color: #f8fafc !important; border-bottom-color: #334155 !important; }
    html.dark .cxd-TextControl-input { background-color: #0f172a !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-TextControl-input:focus { border-color: #6366f1 !important; }
    html.dark .cxd-Button--default { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-Button--default:hover { background-color: #334155 !important; }
    html.dark .cxd-Tabs-link { color: #f8fafc !important; }
    html.dark .cxd-Tabs-link.is-active { background-color: #6366f1 !important; }
  `,
  body: {
    type: "tabs",
    tabsMode: "line",
    tabs: [
      // Tab 1: 什么是 AMIS Agent?
      {
        title: "💡 什么是 AMIS Agent?",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-8">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">欢迎使用 AMIS Agent 🤖</h2>
                  <p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    AMIS Agent 是一个基于 AI 的低代码页面生成工具，让你可以通过自然语言描述来创建复杂的前端页面。
                  </p>
                </div>
              `,
            },
            {
              type: "grid",
              columns: [
                {
                  md: 6,
                  body: {
                    type: "card",
                    header: {
                      title: "🎯 核心特性",
                      className: "font-bold",
                    },
                    body: {
                      type: "list",
                      listItem: {
                        body: [
                          {
                            type: "tpl",
                            tpl: '<span class="text-sm text-slate-700 dark:text-slate-200">${body}</span>',
                          },
                        ],
                      },
                      source: [
                        { body: "✨ 自然语言交互：用中文描述需求即可生成页面" },
                        { body: "🚀 即时生成：秒级响应，实时预览" },
                        { body: "🎨 智能样式：自动应用现代化设计" },
                        { body: "📦 AMIS 组件库：支持 100+ 组件类型" },
                        { body: "🔄 迭代优化：可以反复修改和调整" },
                      ],
                    },
                  },
                },
                {
                  md: 6,
                  body: {
                    type: "card",
                    header: {
                      title: "🛠️ 工作原理",
                      className: "font-bold",
                    },
                    body: {
                      type: "steps",
                      status: "finish",
                      steps: [
                        {
                          title: "描述需求",
                          description: "告诉 AI 你想要什么",
                        },
                        {
                          title: "AI 分析",
                          description: "理解需求并规划页面结构",
                        },
                        {
                          title: "生成代码",
                          description: "输出 AMIS JSON Schema",
                        },
                        { title: "实时预览", description: "立即看到渲染效果" },
                      ],
                    },
                  },
                },
              ],
            },
            {
              type: "alert",
              level: "info",
              className: "mt-6",
              body: "💡 提示：点击右侧的 Copilot 图标打开聊天窗口，开始你的第一个 AI 页面创建之旅！",
            },
          ],
        },
      },

      // Tab 2: 快速开始
      {
        title: "🚀 快速开始",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">创建你的第一个页面</h2>
                  <p class="text-slate-600 dark:text-slate-300">
                    让我们通过几个简单的例子，学习如何使用 AMIS Agent。
                  </p>
                </div>
              `,
            },
            {
              type: "panel",
              title: "示例 1：创建登录表单",
              className: "mb-4",
              body: [
                {
                  type: "tpl",
                  className: "mb-3",
                  tpl: '<p class="text-sm text-slate-700 dark:text-slate-300">在 Copilot 中输入以下内容：</p>',
                },
                {
                  type: "code",
                  language: "text",
                  value: "创建一个登录表单，包含用户名、密码输入框和登录按钮",
                },
                {
                  type: "divider",
                },
                {
                  type: "tpl",
                  className: "mb-2",
                  tpl: '<p class="text-sm font-semibold text-slate-700 dark:text-slate-300">AI 会生成类似这样的表单：</p>',
                },
                {
                  type: "form",
                  mode: "horizontal",
                  title: "用户登录",
                  body: [
                    {
                      type: "input-text",
                      name: "username",
                      label: "用户名",
                      placeholder: "请输入用户名",
                      required: true,
                    },
                    {
                      type: "input-password",
                      name: "password",
                      label: "密码",
                      placeholder: "请输入密码",
                      required: true,
                    },
                    {
                      type: "submit",
                      label: "登录",
                      level: "primary",
                    },
                  ],
                },
              ],
            },
            {
              type: "panel",
              title: "示例 2：创建数据表格",
              className: "mb-4",
              body: [
                {
                  type: "tpl",
                  className: "mb-3",
                  tpl: '<p class="text-sm text-slate-700 dark:text-slate-300">尝试这个指令：</p>',
                },
                {
                  type: "code",
                  language: "text",
                  value: "创建一个用户列表表格，显示姓名、邮箱、状态和操作按钮",
                },
                {
                  type: "divider",
                },
                {
                  type: "tpl",
                  className: "mb-2",
                  tpl: '<p class="text-sm font-semibold text-slate-700 dark:text-slate-300">生成的表格示例：</p>',
                },
                {
                  type: "table",
                  data: {
                    items: [
                      {
                        id: 1,
                        name: "张三",
                        email: "zhang@example.com",
                        status: "active",
                      },
                      {
                        id: 2,
                        name: "李四",
                        email: "li@example.com",
                        status: "inactive",
                      },
                      {
                        id: 3,
                        name: "王五",
                        email: "wang@example.com",
                        status: "active",
                      },
                    ],
                  },
                  columns: [
                    { name: "name", label: "姓名" },
                    { name: "email", label: "邮箱" },
                    {
                      name: "status",
                      label: "状态",
                      type: "status",
                      map: {
                        active: { label: "活跃", status: "success" },
                        inactive: { label: "未激活", status: "warning" },
                      },
                    },
                    {
                      type: "operation",
                      label: "操作",
                      buttons: [
                        { label: "编辑", type: "button", level: "link" },
                        {
                          label: "删除",
                          type: "button",
                          level: "link",
                          className: "text-red-500",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "alert",
              level: "success",
              body: "🎉 提示：你可以随时要求 AI 修改已生成的内容，比如「把表单改成垂直布局」或「给表格添加分页功能」。",
            },
          ],
        },
      },

      // Tab 3: 进阶技巧
      {
        title: "⚡ 进阶技巧",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">掌握高级功能</h2>
                  <p class="text-slate-600 dark:text-slate-300">
                    了解如何充分利用 AMIS Agent 的强大功能。
                  </p>
                </div>
              `,
            },
            {
              type: "collapse",
              accordion: false,
              body: [
                {
                  title: "📋 复杂表单设计",
                  body: {
                    type: "wrapper",
                    body: [
                      {
                        type: "tpl",
                        tpl: '<p class="text-sm mb-2">你可以创建包含多种控件的复杂表单：</p>',
                      },
                      {
                        type: "list",
                        listItem: {
                          body: [
                            {
                              type: "tpl",
                              tpl: '<span class="text-sm">${body}</span>',
                            },
                          ],
                        },
                        source: [
                          {
                            body: "• 日期/时间选择器：input-date, input-datetime",
                          },
                          { body: "• 文件上传：input-file, input-image" },
                          { body: "• 富文本编辑器：input-rich-text" },
                          { body: "• 级联选择：select (多级数据)" },
                          { body: "• 动态表单：combo (可添加/删除行)" },
                        ],
                      },
                      {
                        type: "code",
                        language: "text",
                        className: "mt-3",
                        value:
                          "示例指令：创建一个注册表单，包含姓名、出生日期、头像上传、省市区三级联动选择",
                      },
                    ],
                  },
                },
                {
                  title: "📊 数据可视化",
                  body: {
                    type: "wrapper",
                    body: [
                      {
                        type: "tpl",
                        tpl: '<p class="text-sm mb-2">支持多种图表类型：</p>',
                      },
                      {
                        type: "grid",
                        columns: [
                          {
                            md: 6,
                            body: {
                              type: "list",
                              listItem: {
                                body: [
                                  {
                                    type: "tpl",
                                    tpl: '<span class="text-sm">${body}</span>',
                                  },
                                ],
                              },
                              source: [
                                { body: "📈 折线图 (line chart)" },
                                { body: "📊 柱状图 (bar chart)" },
                                { body: "🥧 饼图 (pie chart)" },
                              ],
                            },
                          },
                          {
                            md: 6,
                            body: {
                              type: "list",
                              listItem: {
                                body: [
                                  {
                                    type: "tpl",
                                    tpl: '<span class="text-sm">${body}</span>',
                                  },
                                ],
                              },
                              source: [
                                { body: "🌍 地图 (map)" },
                                { body: "🎯 仪表盘 (gauge)" },
                                { body: "📉 雷达图 (radar)" },
                              ],
                            },
                          },
                        ],
                      },
                      {
                        type: "code",
                        language: "text",
                        className: "mt-3",
                        value:
                          "示例指令：创建一个销售数据仪表板，包含本月销售额趋势折线图和各产品销量饼图",
                      },
                    ],
                  },
                },
                {
                  title: "🎯 条件显示与联动",
                  body: {
                    type: "wrapper",
                    body: [
                      {
                        type: "tpl",
                        tpl: '<p class="text-sm mb-2">让页面动起来：</p>',
                      },
                      {
                        type: "list",
                        listItem: {
                          body: [
                            {
                              type: "tpl",
                              tpl: '<span class="text-sm">${body}</span>',
                            },
                          ],
                        },
                        source: [
                          { body: "✓ 使用 visibleOn 控制组件显示/隐藏" },
                          { body: "✓ 使用 disabledOn 动态禁用组件" },
                          { body: "✓ 使用 service 组件加载远程数据" },
                          { body: "✓ 通过 onChange 事件触发其他组件更新" },
                        ],
                      },
                      {
                        type: "code",
                        language: "text",
                        className: "mt-3",
                        value:
                          "示例指令：创建一个表单，当用户选择「其他」选项时，显示一个额外的文本输入框",
                      },
                    ],
                  },
                },
                {
                  title: "🎨 样式定制",
                  body: {
                    type: "wrapper",
                    body: [
                      {
                        type: "tpl",
                        tpl: '<p class="text-sm mb-2">AI 可以帮你调整样式：</p>',
                      },
                      {
                        type: "grid",
                        columns: [
                          {
                            md: 6,
                            body: {
                              type: "card",
                              header: { title: "布局" },
                              body: {
                                type: "list",
                                listItem: {
                                  body: [
                                    {
                                      type: "tpl",
                                      tpl: '<span class="text-xs">${body}</span>',
                                    },
                                  ],
                                },
                                source: [
                                  { body: "• 水平/垂直布局" },
                                  { body: "• 栅格系统 (grid)" },
                                  { body: "• 弹性布局 (flex)" },
                                  { body: "• 响应式设计" },
                                ],
                              },
                            },
                          },
                          {
                            md: 6,
                            body: {
                              type: "card",
                              header: { title: "美化" },
                              body: {
                                type: "list",
                                listItem: {
                                  body: [
                                    {
                                      type: "tpl",
                                      tpl: '<span class="text-xs">${body}</span>',
                                    },
                                  ],
                                },
                                source: [
                                  { body: "• 颜色主题" },
                                  { body: "• 圆角/阴影" },
                                  { body: "• 间距调整" },
                                  { body: "• 图标添加" },
                                ],
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },

      // Tab 4: 实际案例
      {
        title: "📚 实际案例",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">真实场景应用</h2>
                  <p class="text-slate-600 dark:text-slate-300">
                    看看 AMIS Agent 如何解决实际业务需求。
                  </p>
                </div>
              `,
            },
            {
              type: "cards",
              source: [
                {
                  title: "🛒 电商后台",
                  description: "商品管理、订单处理、数据统计",
                  prompt:
                    "创建一个电商后台管理页面，包含商品列表（支持搜索、筛选）、订单管理表格和销售统计图表",
                },
                {
                  title: "👥 CRM 系统",
                  description: "客户信息、跟进记录、销售漏斗",
                  prompt:
                    "设计一个 CRM 客户管理界面，左侧客户列表，右侧显示客户详情、跟进记录时间线和销售机会卡片",
                },
                {
                  title: "📊 数据报表",
                  description: "多维度统计、可视化图表",
                  prompt:
                    "生成一个数据分析仪表板，顶部显示关键指标卡片，中部是时间趋势图，底部是数据明细表格",
                },
                {
                  title: "📝 内容发布",
                  description: "富文本编辑、分类标签、发布流程",
                  prompt:
                    "创建一个文章发布表单，包含标题、富文本编辑器、分类选择、标签输入、封面图上传和发布按钮",
                },
                {
                  title: "⚙️ 系统设置",
                  description: "多标签配置、权限管理",
                  prompt:
                    "设计一个系统设置页面，使用标签页组织基础设置、用户权限、通知配置和安全选项",
                },
                {
                  title: "📋 工作流审批",
                  description: "流程步骤、审批记录、状态追踪",
                  prompt:
                    "创建一个审批流程页面，顶部是步骤条展示当前进度，中间是审批表单，底部是历史审批记录",
                },
              ],
              card: {
                header: {
                  title: "${title}",
                  className: "font-bold",
                },
                body: [
                  {
                    type: "tpl",
                    tpl: '<p class="text-sm text-slate-600 dark:text-slate-400 mb-3">${description}</p>',
                  },
                  {
                    type: "alert",
                    level: "info",
                    className: "text-xs",
                    body: "💬 试试这个提示词：",
                  },
                  {
                    type: "code",
                    language: "text",
                    className: "text-xs mt-2",
                    value: "${prompt}",
                  },
                  {
                    type: "button",
                    label: "试试这个案例",
                    level: "primary",
                    size: "sm",
                    className: "mt-3",
                  },
                ],
              },
            },
          ],
        },
      },

      // Tab 5: 常见问题
      {
        title: "❓ 常见问题",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">常见问题解答</h2>
                </div>
              `,
            },
            {
              type: "collapse",
              activeKey: ["q1"],
              body: [
                {
                  key: "q1",
                  title: "Q: 如何让 AI 生成更准确的页面？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 提供详细、具体的描述：</strong></p>
                        <ul class="list-disc pl-5 space-y-1">
                          <li>✓ 明确说明页面类型（表单、表格、仪表板等）</li>
                          <li>✓ 列出需要的字段和组件</li>
                          <li>✓ 描述布局和样式要求</li>
                          <li>✓ 说明特殊交互逻辑</li>
                        </ul>
                        <p class="mt-2"><em>示例：</em>"创建一个用户注册表单，垂直布局，包含用户名(必填)、邮箱(必填且验证格式)、密码(必填且显示强度)、确认密码(需匹配)，底部左对齐提交按钮，使用蓝色主题"</p>
                      </div>
                    `,
                  },
                },
                {
                  key: "q2",
                  title: "Q: AI 生成的结果不满意怎么办？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 你可以：</strong></p>
                        <ul class="list-disc pl-5 space-y-1">
                          <li>🔄 要求修改："把表单改成水平布局"</li>
                          <li>➕ 添加功能："给表格加上分页和搜索"</li>
                          <li>🎨 调整样式："把按钮改成绿色，圆角更大一点"</li>
                          <li>🗑️ 删除内容："移除邮箱字段"</li>
                          <li>🔁 重新生成："重新生成一个简洁的版本"</li>
                        </ul>
                        <p class="mt-2 text-slate-600">💡 AI 会在当前基础上迭代优化，保留你满意的部分。</p>
                      </div>
                    `,
                  },
                },
                {
                  key: "q3",
                  title: "Q: 支持哪些 AMIS 组件？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 支持 AMIS 全部组件，包括但不限于：</strong></p>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <p class="font-semibold mb-1">表单组件：</p>
                            <ul class="list-disc pl-5 text-xs">
                              <li>input-text, input-number</li>
                              <li>input-date, input-datetime</li>
                              <li>select, checkbox, radio</li>
                              <li>input-file, input-image</li>
                              <li>input-rich-text, editor</li>
                            </ul>
                          </div>
                          <div>
                            <p class="font-semibold mb-1">展示组件：</p>
                            <ul class="list-disc pl-5 text-xs">
                              <li>table, table2, cards</li>
                              <li>chart (各种图表)</li>
                              <li>tabs, collapse, wizard</li>
                              <li>timeline, steps</li>
                              <li>dialog, drawer, toast</li>
                            </ul>
                          </div>
                        </div>
                        <p class="mt-2 text-slate-600">💡 直接用中文描述组件名称即可，如「下拉选择框」、「日期选择器」等。</p>
                      </div>
                    `,
                  },
                },
                {
                  key: "q4",
                  title: "Q: 如何导出生成的代码？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 有三种方式：</strong></p>
                        <ol class="list-decimal pl-5 space-y-1">
                          <li>在聊天界面中查看"最终结果卡片"，点击"复制 JSON"按钮</li>
                          <li>要求 AI："请显示完整的 JSON 配置"</li>
                          <li>打开浏览器开发者工具，在 Console 中输入 <code class="bg-slate-100 px-1 py-0.5 rounded">window.amisScoped.props.schema</code></li>
                        </ol>
                        <p class="mt-2 text-slate-600">📄 复制后的 JSON 可以直接用于你的项目中。</p>
                      </div>
                    `,
                  },
                },
                {
                  key: "q5",
                  title: "Q: 生成的页面可以直接用于生产环境吗？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 建议先进行以下检查：</strong></p>
                        <ul class="list-disc pl-5 space-y-1">
                          <li>⚠️ 验证数据接口 API 地址是否正确</li>
                          <li>⚠️ 检查表单验证规则是否符合业务需求</li>
                          <li>⚠️ 测试不同数据量下的性能表现</li>
                          <li>⚠️ 确认权限控制逻辑</li>
                          <li>⚠️ 进行跨浏览器兼容性测试</li>
                        </ul>
                        <p class="mt-2 text-green-600">✓ AI 生成的代码结构良好、符合规范，但具体业务逻辑需要根据实际需求调整。</p>
                      </div>
                    `,
                  },
                },
                {
                  key: "q6",
                  title: "Q: 如何学习 AMIS 语法？",
                  body: {
                    type: "tpl",
                    tpl: `
                      <div class="text-sm space-y-2">
                        <p><strong>A: 推荐学习资源：</strong></p>
                        <ul class="list-disc pl-5 space-y-1">
                          <li>📖 <a href="https://baidu.gitee.io/amis" target="_blank" class="text-blue-600 hover:underline">AMIS 官方文档</a></li>
                          <li>💡 在编辑器中查看 AI 生成的 JSON，学习其结构</li>
                          <li>🔍 要求 AI 解释："请解释这段配置的作用"</li>
                          <li>✨ 多尝试不同的描述方式，观察 AI 的输出差异</li>
                        </ul>
                        <p class="mt-2 text-slate-600">💡 熟悉几个核心组件后，你就可以手动调整 AI 生成的代码了。</p>
                      </div>
                    `,
                  },
                },
              ],
            },
          ],
        },
      },

      // Tab 6: 快捷指令
      {
        title: "⚡ 快捷指令",
        body: {
          type: "wrapper",
          className: "p-6 max-w-5xl mx-auto",
          body: [
            {
              type: "tpl",
              tpl: `
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-slate-800 dark:text-white mb-4">常用提示词模板</h2>
                  <p class="text-slate-600 dark:text-slate-300">
                    复制这些模板，替换具体内容后使用。
                  </p>
                </div>
              `,
            },
            {
              type: "grid",
              columns: [
                {
                  md: 6,
                  body: {
                    type: "panel",
                    title: "🎯 通用模板",
                    body: {
                      type: "list",
                      listItem: {
                        body: [
                          {
                            type: "code",
                            language: "text",
                            className: "text-xs mb-2",
                            value: "${body}",
                          },
                        ],
                      },
                      source: [
                        {
                          body: "创建一个 [类型] 页面，包含 [功能1]、[功能2]、[功能3]",
                        },
                        {
                          body: "生成 [数据类型] 的 [展示方式]，字段包括 [字段1]、[字段2]",
                        },
                        {
                          body: "设计一个 [布局方式] 的界面，左侧 [内容1]，右侧 [内容2]",
                        },
                        { body: "修改 [组件名称]，改成 [新样式/新功能]" },
                      ],
                    },
                  },
                },
                {
                  md: 6,
                  body: {
                    type: "panel",
                    title: "📝 表单专用",
                    body: {
                      type: "list",
                      listItem: {
                        body: [
                          {
                            type: "code",
                            language: "text",
                            className: "text-xs mb-2",
                            value: "${body}",
                          },
                        ],
                      },
                      source: [
                        {
                          body: "创建 [表单名称] 表单，[布局方式] 布局，包含 [字段列表]",
                        },
                        {
                          body: "添加 [字段名称] 字段，类型是 [控件类型]，[是否必填]",
                        },
                        { body: "为 [字段名称] 添加验证规则：[验证条件]" },
                        {
                          body: "让 [字段A] 和 [字段B] 联动，当 [字段A] 是 [值] 时，显示 [字段B]",
                        },
                      ],
                    },
                  },
                },
              ],
            },
            {
              type: "grid",
              columns: [
                {
                  md: 6,
                  body: {
                    type: "panel",
                    title: "📊 表格/列表",
                    body: {
                      type: "list",
                      listItem: {
                        body: [
                          {
                            type: "code",
                            language: "text",
                            className: "text-xs mb-2",
                            value: "${body}",
                          },
                        ],
                      },
                      source: [
                        {
                          body: "创建 [数据类型] 列表，显示 [列1]、[列2]、[列3] 列",
                        },
                        { body: "添加操作列，包含 [操作1]、[操作2] 按钮" },
                        { body: "添加顶部搜索栏，支持按 [字段] 搜索" },
                        { body: "添加分页功能，每页显示 [数量] 条" },
                      ],
                    },
                  },
                },
                {
                  md: 6,
                  body: {
                    type: "panel",
                    title: "🎨 样式调整",
                    body: {
                      type: "list",
                      listItem: {
                        body: [
                          {
                            type: "code",
                            language: "text",
                            className: "text-xs mb-2",
                            value: "${body}",
                          },
                        ],
                      },
                      source: [
                        { body: "把 [组件] 的颜色改成 [颜色]" },
                        { body: "调整 [区域] 的间距为 [数值]" },
                        { body: "为 [组件] 添加 [图标]" },
                        { body: "让 [组件] 在 [条件] 时隐藏" },
                      ],
                    },
                  },
                },
              ],
            },
            {
              type: "alert",
              level: "warning",
              className: "mt-4",
              body: "💡 提示：用 [] 标记的部分需要替换成你的实际内容。描述越详细，生成的结果越准确！",
            },
          ],
        },
      },
    ],
  },
};

// 声明全局类型
declare global {
  interface Window {
    amisRequire?: any;
    amisScoped?: any;
  }
}

type AmisInstance = {
  updateSchema: (schema: Record<string, unknown>) => void;
  updateProps: (props: Record<string, unknown>) => void;
};

export default function AmisAgentChat() {
  const { theme } = { theme: "light" }; // Simple theme mock or use a real hook if available
  useCoAgentStateRender<AmisAgentState>({
    name: "generative_ui",
    render: ({ state }) => {
      if (!state.tasks || state.tasks.length === 0) {
        return null;
      }

      const completedCount = state.tasks.filter(
        (step) => step.status === "completed",
      ).length;
      const progressPercentage = (completedCount / state.tasks.length) * 100;

      return (
        <div className="flex">
          <div
            data-testid="task-progress"
            className={`relative rounded-xl w-[700px] p-6 shadow-lg backdrop-blur-sm ${
              theme === "dark"
                ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50 shadow-2xl"
                : "bg-gradient-to-br from-white via-gray-50 to-white text-gray-800 border border-gray-200/80"
            }`}
          >
            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Task Progress
                </h3>
                <div
                  className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}
                >
                  {completedCount}/{state.tasks.length} Complete
                </div>
              </div>

              {/* Progress Bar */}
              <div
                className={`relative h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className={`absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent to-transparent animate-pulse ${
                    theme === "dark" ? "via-white/20" : "via-white/40"
                  }`}
                />
              </div>
            </div>

            {/* tasks */}
            <div className="space-y-2">
              {state.tasks.map((step, index) => {
                const isCompleted = step.status === "completed";
                const isCurrentPending =
                  step.status === "pending" &&
                  index ===
                    state.tasks.findIndex((s) => s.status === "pending");
                const isFuturePending =
                  step.status === "pending" && !isCurrentPending;

                return (
                  <div
                    key={index}
                    className={`relative flex items-center p-2.5 rounded-lg transition-all duration-500 ${
                      isCompleted
                        ? theme === "dark"
                          ? "bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30"
                          : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60"
                        : isCurrentPending
                          ? theme === "dark"
                            ? "bg-gradient-to-r from-blue-900/40 to-purple-900/30 border border-blue-500/50 shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/60 shadow-md shadow-blue-200/50"
                          : theme === "dark"
                            ? "bg-slate-800/50 border border-slate-600/30"
                            : "bg-gray-50/50 border border-gray-200/60"
                    }`}
                  >
                    {/* Connector Line */}
                    {index < state.tasks.length - 1 && (
                      <div
                        className={`absolute left-5 top-full w-0.5 h-2 bg-gradient-to-b ${
                          theme === "dark"
                            ? "from-slate-500 to-slate-600"
                            : "from-gray-300 to-gray-400"
                        }`}
                      />
                    )}

                    {/* Status Icon */}
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                        isCompleted
                          ? theme === "dark"
                            ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                            : "bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200"
                          : isCurrentPending
                            ? theme === "dark"
                              ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                              : "bg-gradient-to-br from-blue-500 to-purple-600 shadow-md shadow-blue-200"
                            : theme === "dark"
                              ? "bg-slate-700 border border-slate-600"
                              : "bg-gray-300 border border-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon />
                      ) : isCurrentPending ? (
                        <ClockIcon className="animate-spin" />
                      ) : (
                        <ClockIcon />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        data-testid="task-step-text"
                        className={`font-semibold transition-all duration-300 text-sm ${
                          isCompleted
                            ? theme === "dark"
                              ? "text-green-300"
                              : "text-green-700"
                            : isCurrentPending
                              ? theme === "dark"
                                ? "text-blue-300 text-base"
                                : "text-blue-700 text-base"
                              : theme === "dark"
                                ? "text-slate-400"
                                : "text-gray-500"
                        }`}
                      >
                        {step.description}
                      </div>
                      {isCurrentPending && (
                        <div
                          className={`text-sm mt-1 animate-pulse ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          Processing...
                        </div>
                      )}
                    </div>

                    {/* Animated Background for Current Step */}
                    {isCurrentPending && (
                      <div
                        className={`absolute inset-0 rounded-lg bg-gradient-to-r animate-pulse ${
                          theme === "dark"
                            ? "from-blue-500/10 to-purple-500/10"
                            : "from-blue-100/50 to-purple-100/50"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Decorative Elements */}
            <div
              className={`absolute top-3 right-3 w-16 h-16 rounded-full blur-xl ${
                theme === "dark"
                  ? "bg-gradient-to-br from-blue-500/10 to-purple-500/10"
                  : "bg-gradient-to-br from-blue-200/30 to-purple-200/30"
              }`}
            />
            <div
              className={`absolute bottom-3 left-3 w-12 h-12 rounded-full blur-xl ${
                theme === "dark"
                  ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                  : "bg-gradient-to-br from-green-200/30 to-emerald-200/30"
              }`}
            />
          </div>
        </div>
      );
    },
  });

  return (
    <CopilotSidebar
      labels={{
        initial:
          "Hi, I'm your Amis AI Agent! I can help you design and modify this page. Try saying 'Add a login form' or 'Change the title'.",
      }}
      suggestions={[
        {
          title: "Create Form",
          message: `{
    "platformWorksNumDist": {"youtube":45,"tiktok":20,"ins":1356},
    "platformInteractiveDist": {"youtube":12930,"tiktok":13818,"ins":1537641},
    "platformAccountNumDist": {"youtube":19,"tiktok":14,"ins":591},
    "accountCatStats": {
        "youtube": {
            "People&Society": {
                "p": 6070,
                "kl": {
                    "MicroInfluencer": {
                        "p": 6070,
                        "c": 8,
                        "i": 81878
                    }
                },
                "c": 8,
                "i": 81878
            },
            "Entertainment": {
                "p": 480,
                "kl": {
                    "MicroInfluencer": {
                        "p": 480,
                        "c": 1,
                        "i": 864
                    }
                },
                "c": 1,
                "i": 864
            },
            "Education": {
                "p": 1000,
                "kl": {
                    "MicroInfluencer": {
                        "p": 1000,
                        "c": 1,
                        "i": 7321
                    }
                },
                "c": 1,
                "i": 7321
            },
            "Comedy": {
                "p": 480,
                "kl": {
                    "MicroInfluencer": {
                        "p": 480,
                        "c": 1,
                        "i": 9982
                    }
                },
                "c": 1,
                "i": 9982
            },
            "Travel&Adventure": {
                "p": 480,
                "kl": {
                    "MicroInfluencer": {
                        "p": 480,
                        "c": 1,
                        "i": 29687
                    }
                },
                "c": 1,
                "i": 29687
            }
          
        },
        "tiktok": {
            "Fashion&Beauty": {
                "p": 5620,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 3110,
                        "c": 2,
                        "i": 2721420
                    },
                    "MicroInfluencer": {
                        "p": 2510,
                        "c": 3,
                        "i": 4849534
                    }
                },
                "c": 5,
                "i": 7570954
            },
            "Lifestyle": {
                "p": 4080,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 3350,
                        "c": 1,
                        "i": 19574401
                    },
                    "MicroInfluencer": {
                        "p": 730,
                        "c": 1,
                        "i": 1613236
                    }
                },
                "c": 2,
                "i": 21187637
            },
            "Comedy": {
                "p": 17620,
                "kl": {
                    "MacroInfluencer": {
                        "p": 17620,
                        "c": 1,
                        "i": 16353039
                    }
                },
                "c": 1,
                "i": 16353039
            },
            "Family&Parenting": {
                "p": 1480,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 1480,
                        "c": 1,
                        "i": 2408349
                    }
                },
                "c": 1,
                "i": 2408349
            },
            "Music&Dance": {
                "p": 48590,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 3590,
                        "c": 1,
                        "i": 9913817
                    },
                    "MegaInfluencer": {
                        "p": 45000,
                        "c": 1,
                        "i": 31126657
                    }
                },
                "c": 2,
                "i": 41040474
            }
        },
        "ins": {
            "DIY&Crafts": {
                "p": 16100,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 11450,
                        "c": 3,
                        "i": 3937435
                    },
                    "MicroInfluencer": {
                        "p": 4650,
                        "c": 3,
                        "i": 102406
                    }
                },
                "c": 6,
                "i": 4039841
            },
            "Art": {
                "p": 3770,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 3770,
                        "c": 1,
                        "i": 622624
                    }
                },
                "c": 1,
                "i": 622624
            },
            "Business&Finance": {
                "p": 384090,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 52410,
                        "c": 7,
                        "i": 4037958
                    },
                    "MegaInfluencer": {
                        "p": 293510,
                        "c": 3,
                        "i": 19069242
                    },
                    "MacroInfluencer": {
                        "p": 9940,
                        "c": 1,
                        "i": 975449
                    },
                    "MicroInfluencer": {
                        "p": 28230,
                        "c": 15,
                        "i": 616357
                    }
                },
                "c": 26,
                "i": 24699006
            },
            "Entertainment": {
                "p": 12670,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 10610,
                        "c": 2,
                        "i": 6126547
                    },
                    "MicroInfluencer": {
                        "p": 2060,
                        "c": 3,
                        "i": 484284
                    }
                },
                "c": 5,
                "i": 6610831
            },
            "Health&Fitness": {
                "p": 88120,
                "kl": {
                    "Mid-tierInfluencer": {
                        "p": 60460,
                        "c": 17,
                        "i": 11227600
                    },
                    "MegaInfluencer": {
                        "p": 13610,
                        "c": 1,
                        "i": 4783444
                    },
                    "MacroInfluencer": {
                        "p": 8390,
                        "c": 1,
                        "i": 3210556
                    },
                    "MicroInfluencer": {
                        "p": 5660,
                        "c": 5,
                        "i": 408110
                    }
                },
                "c": 24,
                "i": 19629710
            }
        }
    }
} 帮我生成报告并且分析`,
        },
        {
          title: "Modify Style",
          message: "make the form use horizontal layout",
        },
      ]}
    >
      <AmisEditorPage />
    </CopilotSidebar>
  );
}

function AmisEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const sdkReady = useAmisSdk();

  const ref = useRef<AmisInstance | null>(null);

  // 当 schema 更新时重新渲染
  const updateSchema = useCallback((newSchema: Record<string, unknown>) => {
    console.log("准备更新 schema:", newSchema);

    if (ref.current && typeof ref.current.updateSchema === "function") {
      try {
        ref.current.updateSchema(newSchema);
        console.log("✅ Schema 更新成功");
      } catch (error) {
        console.error("❌ Schema 更新失败:", error);
      }
    } else {
      console.warn("⚠️ amis 实例未就绪或 updateSchema 方法不可用");
    }
  }, []);

  const { state } = useCoAgent<AmisAgentState>({
    name: "AmisEditorPageAgent",
    initialState: {
      schema: DEFAULT_SCHEMA,
    },
  });

  useEffect(() => {
    updateSchema(state.schema as any);
  }, [state.schema]);

  // 初始化 amis
  useEffect(() => {
    if (sdkReady && isClient && containerRef.current && !window.amisScoped) {
      const amis = window.amisRequire("amis/embed");
      ref.current = amis.embed(containerRef.current, DEFAULT_SCHEMA);
    }
  }, [sdkReady, isClient]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
        Loading Editor...
      </div>
    );
  }

  return (
    <>
      <main className="relative flex">
        <div className="flex-1 h-full relative z-0">
          <div
            ref={containerRef}
            id="amis-app-container"
            className="h-full w-full"
          />
        </div>
      </main>
    </>
  );
}

// ============================================================
// 生成式 UI 组件
// ============================================================

/**
 * 状态徽章组件
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { color: string; icon: string; text: string }
  > = {
    loading: {
      color: "bg-yellow-100 text-yellow-800",
      icon: "⏳",
      text: "处理中",
    },
    completed: {
      color: "bg-green-100 text-green-800",
      icon: "✅",
      text: "完成",
    },
    error: { color: "bg-red-100 text-red-800", icon: "❌", text: "失败" },
    executing: {
      color: "bg-blue-100 text-blue-800",
      icon: "⚙️",
      text: "执行中",
    },
    pending: { color: "bg-gray-100 text-gray-800", icon: "⏸️", text: "等待中" },
  };

  const config = statusConfig[status] || statusConfig.loading;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}
    >
      <span>{config.icon}</span>
      {config.text}
    </span>
  );
}

/**
 * 文档检索卡片组件
 * 用于 retrieveDocumentation 工具调用时渲染
 */
function DocRetrievalCard({
  query,
  taskType,
  status = "inProgress",
  result,
}: {
  query?: string;
  taskType?: string;
  status?: "complete" | "executing" | "inProgress";
  result?: any;
}) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <h4 className="font-bold text-gray-800">文档检索</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-gray-600">查询关键词：</span>
          <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">
            {query}
          </code>
        </p>
        <p>
          <span className="text-gray-600">任务类型：</span>
          <code className="bg-purple-100 px-2 py-0.5 rounded text-xs">
            {taskType}
          </code>
        </p>

        {status === "inProgress" && (
          <div className="flex items-center gap-2 mt-3 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            <span>正在检索相关文档...</span>
          </div>
        )}

        {status === "complete" && result?.success && (
          <div className="mt-3 space-y-2">
            <p className="text-green-600 font-medium">
              ✅ 找到 {result.count} 个相关文档
            </p>
            <div className="bg-white rounded p-2 max-h-40 overflow-auto">
              {result.documents?.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="text-xs border-b last:border-0 pb-1 mb-1 last:mb-0"
                >
                  <p className="text-blue-700 font-medium">📄 {doc.path}</p>
                  <p className="text-gray-500 mt-0.5">
                    {doc.codeExamples?.length || 0} 个代码示例
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 任务进度卡片组件
 * 用于显示任务规划和执行进度
 */

/**
 * 优化后的 JSON 查看组件
 * 只在展开时或数据变化时进行序列化，避免昂贵的渲染开销
 */
function JsonViewer({
  data,
  title = "查看结果",
  className = "mt-1",
}: {
  data: any;
  title?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // 只有在打开时才计算 JSON 字符串
  const jsonString = useMemo(() => {
    if (!isOpen) return "";
    return JSON.stringify(data, null, 2);
  }, [data, isOpen]);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-green-600 cursor-pointer hover:underline flex items-center gap-1 focus:outline-hidden"
      >
        <span
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        {title}
      </button>
      {isOpen && (
        <pre className="mt-1 p-2 bg-gray-900 text-green-400 rounded-md text-xs overflow-auto max-h-48 shadow-inner">
          {jsonString}
        </pre>
      )}
    </div>
  );
}

/**
 * 任务进度卡片组件
 * 用于显示任务规划和执行进度
 * 使用 React.memo 避免不必要的重绘
 */
import { Check, Clock, Loader2 } from "lucide-react";

const TaskProgressCard = memo(function TaskProgressCard({
  tasks,
  currentTaskIndex,
}: {
  tasks: Task[];
  currentTaskIndex: number;
}) {
  if (!tasks || tasks.length === 0) return null;

  const completedCount = currentTaskIndex;
  const progressPercentage = (completedCount / tasks.length) * 100;
  // 简化的 theme 处理，默认 light
  const theme: string = "light";

  return (
    <div className="flex">
      <div
        data-testid="task-progress"
        className={`relative rounded-xl w-full p-6 shadow-lg backdrop-blur-sm overflow-hidden ${
          theme === "dark"
            ? "bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50 shadow-2xl"
            : "bg-linear-to-br from-white via-gray-50 to-white text-gray-800 border border-gray-200/80"
        }`}
      >
        {/* Header */}
        <div className="mb-5 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Task Progress
            </h3>
            <div
              className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}
            >
              {completedCount}/{tasks.length} Complete
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className={`relative h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}
          >
            <div
              className="absolute top-0 left-0 h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className={`absolute top-0 left-0 h-full w-full bg-linear-to-r from-transparent to-transparent animate-pulse ${
                theme === "dark" ? "via-white/20" : "via-white/40"
              }`}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2 relative z-10">
          {tasks.map((task, index) => {
            const isCompleted = index < currentTaskIndex;
            const isCurrentPending = index === currentTaskIndex;

            return (
              <div
                key={task.id || index}
                className={`relative flex items-center p-2.5 rounded-lg transition-all duration-500 ${
                  isCompleted
                    ? theme === "dark"
                      ? "bg-linear-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30"
                      : "bg-linear-to-r from-green-50 to-emerald-50 border border-green-200/60"
                    : isCurrentPending
                      ? theme === "dark"
                        ? "bg-linear-to-r from-blue-900/40 to-purple-900/30 border border-blue-500/50 shadow-lg shadow-blue-500/20"
                        : "bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200/60 shadow-md shadow-blue-200/50"
                      : theme === "dark"
                        ? "bg-slate-800/50 border border-slate-600/30"
                        : "bg-gray-50/50 border border-gray-200/60"
                }`}
              >
                {/* Connector Line */}
                {index < tasks.length - 1 && (
                  <div
                    className={`absolute left-5 top-full w-0.5 h-2 bg-linear-to-b ${
                      theme === "dark"
                        ? "from-slate-500 to-slate-600"
                        : "from-gray-300 to-gray-400"
                    }`}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                    isCompleted
                      ? theme === "dark"
                        ? "bg-linear-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                        : "bg-linear-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200"
                      : isCurrentPending
                        ? theme === "dark"
                          ? "bg-linear-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                          : "bg-linear-to-br from-blue-500 to-purple-600 shadow-md shadow-blue-200"
                        : theme === "dark"
                          ? "bg-slate-700 border border-slate-600"
                          : "bg-gray-300 border border-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isCurrentPending ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div
                    data-testid="task-step-text"
                    className={`font-semibold transition-all duration-300 text-sm ${
                      isCompleted
                        ? theme === "dark"
                          ? "text-green-300"
                          : "text-green-700"
                        : isCurrentPending
                          ? theme === "dark"
                            ? "text-blue-300 text-base"
                            : "text-blue-700 text-base"
                          : theme === "dark"
                            ? "text-slate-400"
                            : "text-gray-500"
                    }`}
                  >
                    {task.description}
                  </div>
                  {isCurrentPending && (
                    <div
                      className={`text-sm mt-1 animate-pulse ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Processing...
                    </div>
                  )}
                  {isCompleted && task.result && (
                    <JsonViewer data={task.result} title="查看结果" />
                  )}
                </div>

                {/* Animated Background for Current Step */}
                {isCurrentPending && (
                  <div
                    className={`absolute inset-0 rounded-lg bg-linear-to-r animate-pulse ${
                      theme === "dark"
                        ? "from-blue-500/10 to-purple-500/10"
                        : "from-blue-100/50 to-purple-100/50"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Decorative Elements */}
        <div
          className={`absolute top-3 right-3 w-16 h-16 rounded-full blur-xl ${
            theme === "dark"
              ? "bg-linear-to-br from-blue-500/10 to-purple-500/10"
              : "bg-linear-to-br from-blue-200/30 to-purple-200/30"
          }`}
        />
        <div
          className={`absolute bottom-3 left-3 w-12 h-12 rounded-full blur-xl ${
            theme === "dark"
              ? "bg-linear-to-br from-green-500/10 to-emerald-500/10"
              : "bg-linear-to-br from-green-200/30 to-emerald-200/30"
          }`}
        />
      </div>
    </div>
  );
});

/**

 * 最终结果卡片组件

 * 用于显示生成的 amis JSON 配置

 * 使用 React.memo 避免不必要的重绘

 */

const FinalResultCard = memo(function FinalResultCard({
  schema,
  executionLog,
  onApply,
}: {
  schema: object;
  executionLog?: ExecutionEvent[];
  onApply?: (schema: any) => void;
}) {
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
  };

  const handleApplySchema = () => {
    if (onApply) {
      onApply(schema);
    }
  };

  const jsonString = useMemo(() => {
    if (!isJsonOpen) return "";

    return JSON.stringify(schema, null, 2);
  }, [schema, isJsonOpen]);

  return (
    <div className="bg-linear-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 mb-3 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎉</span>

          <div>
            <h4 className="font-bold text-lg text-gray-800">配置生成完成</h4>

            <p className="text-sm text-gray-600">amis JSON 已准备就绪</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
            onClick={handleCopyJson}
          >
            <span>📋</span> 复制 JSON
          </button>

          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
            onClick={handleApplySchema}
          >
            <span>✨</span> 应用到编辑器
          </button>
        </div>
      </div>

      {/* JSON 预览 */}

      <div className="mb-3">
        <button
          onClick={() => setIsJsonOpen(!isJsonOpen)}
          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-blue-600 focus:outline-hidden"
        >
          <span
            className={`transition-transform duration-200 ${isJsonOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          📄 查看完整配置 {isJsonOpen ? "(点击折叠)" : "(点击展开)"}
        </button>

        {isJsonOpen && (
          <div className="mt-2 relative">
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-96">
              {jsonString}
            </pre>
          </div>
        )}
      </div>

      {/* 执行日志 */}

      {executionLog && executionLog.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-blue-600">
            📊 执行日志 ({executionLog.length} 条记录)
          </summary>

          <div className="mt-2 bg-white rounded-lg p-3 max-h-48 overflow-auto">
            {executionLog.slice(-50).map((event, index) => (
              <div
                key={index}
                className="text-xs border-l-2 border-gray-300 pl-3 mb-2 last:mb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      event.type === "error"
                        ? "bg-red-100 text-red-700"
                        : event.type === "task_complete"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {event.type}
                  </span>
                </div>

                {event.message && (
                  <p className="text-gray-600 mt-1">{event.message}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
});

/**
 * 执行日志时间线组件
 */
function Timeline({ events }: { events: ExecutionEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={index}
          className="flex items-start gap-3 pb-2 last:pb-0 border-b last:border-0 border-gray-100"
        >
          <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  event.type === "error"
                    ? "bg-red-100 text-red-700"
                    : event.type === "task_complete"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {event.type}
              </span>
            </div>
            {event.message && (
              <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
            )}
            {event.taskId && (
              <p className="text-xs text-gray-400">任务: {event.taskId}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 导出组件供外部使用
export {
  DocRetrievalCard,
  TaskProgressCard,
  FinalResultCard,
  StatusBadge,
  Timeline,
};
