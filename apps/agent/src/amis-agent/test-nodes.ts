import { planner_node } from "./nodes/planner.js";
import { docs_associate_node } from "./nodes/docs-associate.js";
import { executor_node } from "./nodes/executor.js";
import { composer_node } from "./nodes/composer.js";
import { AmisAgentState } from "./state.js";
import { HumanMessage } from "@langchain/core/messages";

/**
 * 模拟完整的 AmisAgentState
 */
function createMockState(
  overrides: Partial<AmisAgentState> = {},
): AmisAgentState {
  return {
    messages: [],
    userRequirement: "创建一个包含用户名和密码的登录表单",
    tasks: [],
    currentTaskIndex: 0,
    taskResults: [],
    schema: {},
    executionLog: [],
    feedbackStatus: "pending",
    contextDocuments: [],
    needsReplan: false,
    ...overrides,
  };
}

const mockConfig = { configurable: { thread_id: "test-thread" } };

/**
 * 测试 Planner Node
 */
async function testPlanner() {
  console.log("\n--- Testing Planner Node ---");
  const state = createMockState();
  const result = await planner_node(state, mockConfig);
  console.log(
    "✅ Planner Result Tasks:",
    JSON.stringify(result.tasks, null, 2),
  );
  return result.tasks;
}

/**
 * 测试 Planner Node (带数据依赖)
 */
async function testPlannerWithData() {
  console.log("\n--- Testing Planner Node (With Data Dependencies) ---");
  const state = createMockState({
    userRequirement: "创建一个用户管理表格，展示姓名、邮箱和注册时间，并允许编辑邮箱",
    processData: {
      rawData: "",
      dataStructure: {
        users: [
          {
            id: 1,
            name: "Alice",
            email: "alice@example.com",
            signedUpAt: "2023-01-01",
          },
          {
            id: 2,
            name: "Bob",
            email: "bob@example.com",
            signedUpAt: "2023-01-02",
          },
        ],
      },
      dataMeta: {
        description: "用户列表数据",
        schema: {},
        type: "json",
      },
    },
  });
  const result = await planner_node(state, mockConfig);
  console.log(
    "✅ Planner Result Tasks:",
    JSON.stringify(result.tasks, null, 2),
  );
  return result.tasks;
}

/**
 * 测试 Planner Node (销售报表场景 - 自然语言数据提取后)
 */
async function testPlannerSales() {
  console.log("\n--- Testing Planner Node (Sales Report Scenario) ---");
  const state = createMockState({
    userRequirement: "根据这些销售数据生成一个报表，并分析一下第一季度的趋势",
    processData: {
      rawData: "一月份销售额100万，二月份120万，三月份80万",
      dataStructure: [
        { month: "一月", amount: 100, unit: "万" },
        { month: "二月", amount: 120, unit: "万" },
        { month: "三月", amount: 80, unit: "万" },
      ],
      dataMeta: {
        description: "2024年第一季度月度销售额",
        schema: {},
        type: "json",
      },
    },
  });
  const result = await planner_node(state, mockConfig);
  console.log(
    "✅ Planner Result Tasks:",
    JSON.stringify(result.tasks, null, 2),
  );

  // 如果有任务，继续测试 Executor 以验证数据绑定
  if (result.tasks && result.tasks.length > 0) {
    console.log("\n--- Proceeding to Test Executor with Generated Tasks ---");
    // 更新 state 的 tasks
    state.tasks = result.tasks;
    state.currentTaskIndex = 0;

    // 模拟逐个执行任务
    for (let i = 0; i < state.tasks.length; i++) {
      state.currentTaskIndex = i;
      const execResult = await executor_node(state, mockConfig);
      // 更新任务结果
      state.tasks = execResult.tasks;
      
      const task = state.tasks[i];
      console.log(`\n✅ Task ${i + 1} Result (${task.type}):`);
      console.log(task.rawResult);
    }
  }

  return result.tasks;
}

/**
 * 测试 Docs Associate Node
 */
async function testDocsAssociate() {
  console.log("\n--- Testing Docs Associate Node ---");
  const mockTasks = [
    {
      id: "task-1",
      description:
        "创建表单容器，设置表单提交API地址为/api/login，提交方法为post，并配置表单标签宽度",
      type: "form-container",
      priority: 1,
      docPaths: [],
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-2",
      description:
        "添加用户名输入框，设置name为username，label为'用户名'，placeholder为'请输入用户名'，并配置必填验证规则",
      type: "form-item-input-text",
      priority: 1,
      docPaths: [],
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-3",
      description:
        "添加密码输入框，设置name为password，label为'密码'，type为'input-password'，placeholder为'请输入密码'，并配置必填验证规则",
      type: "form-item-input-password",
      priority: 1,
      docPaths: [],
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-4",
      description:
        "添加提交按钮，设置label为'登录'，type为'submit'，并配置primary样式",
      type: "form-item-submit",
      priority: 2,
      docPaths: [],
      status: "pending",
      retryCount: 0,
    },
    {
      id: "task-5",
      description:
        "将表单容器、用户名输入框、密码输入框和提交按钮组装成完整的登录表单页面",
      type: "form-assembly",
      priority: 1,
      docPaths: [],
      status: "pending",
      retryCount: 0,
    },
  ];
  const state = createMockState({ tasks: mockTasks });
  const result = await docs_associate_node(state, mockConfig);
  console.log(
    "✅ Docs Associate Result:",
    JSON.stringify(result.tasks, null, 2),
  );
}

/**
 * 测试 Executor Node
 */
async function testExecutor() {
  console.log("\n--- Testing Executor Node ---");
  const mockTasks = [
    {
      id: "task-1",
      description:
        "创建表单容器，设置表单提交API地址为/api/login，提交方法为post，并配置表单标签宽度",
      type: "form-container",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\form\\button-group-select.md",
        "src\\docs\\components\\form\\button-toolbar.md",
        "src\\docs\\components\\form\\chain-select.md",
      ],
      status: "pending",
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\button-group-select.md",
        },
        {
          path: "src\\docs\\components\\form\\button-toolbar.md",
        },
        {
          path: "src\\docs\\components\\form\\chain-select.md",
        },
      ],
    },
    {
      id: "task-2",
      description:
        "添加用户名输入框，设置name为username，label为'用户名'，placeholder为'请输入用户名'，并配置必填验证规则",
      type: "form-item-input-text",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\form\\input-array.md",
        "src\\docs\\components\\form\\input-city.md",
        "src\\docs\\components\\form\\input-color.md",
      ],
      status: "pending",
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\input-array.md",
        },
        {
          path: "src\\docs\\components\\form\\input-city.md",
        },
        {
          path: "src\\docs\\components\\form\\input-color.md",
        },
      ],
    },
    {
      id: "task-3",
      description:
        "添加密码输入框，设置name为password，label为'密码'，type为'input-password'，placeholder为'请输入密码'，并配置必填验证规则",
      type: "form-item-input-password",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\form\\input-array.md",
        "src\\docs\\components\\form\\input-city.md",
        "src\\docs\\components\\form\\input-color.md",
      ],
      status: "pending",
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\input-array.md",
        },
        {
          path: "src\\docs\\components\\form\\input-city.md",
        },
        {
          path: "src\\docs\\components\\form\\input-color.md",
        },
      ],
    },
    {
      id: "task-4",
      description:
        "添加提交按钮，设置label为'登录'，type为'submit'，并配置primary样式",
      type: "form-item-submit",
      priority: 2,
      docPaths: [
        "src\\docs\\components\\form\\button-group-select.md",
        "src\\docs\\components\\form\\button-toolbar.md",
        "src\\docs\\components\\form\\chain-select.md",
      ],
      status: "pending",
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\button-group-select.md",
        },
        {
          path: "src\\docs\\components\\form\\button-toolbar.md",
        },
        {
          path: "src\\docs\\components\\form\\chain-select.md",
        },
      ],
    },
    {
      id: "task-5",
      description:
        "将表单容器、用户名输入框、密码输入框和提交按钮组装成完整的登录表单页面",
      type: "form-assembly",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\form\\button-group-select.md",
        "src\\docs\\components\\form\\button-toolbar.md",
        "src\\docs\\components\\form\\chain-select.md",
      ],
      status: "pending",
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\button-group-select.md",
        },
        {
          path: "src\\docs\\components\\form\\button-toolbar.md",
        },
        {
          path: "src\\docs\\components\\form\\chain-select.md",
        },
      ],
    },
  ];
  const state = createMockState({
    tasks: mockTasks,
    currentTaskIndex: 0,
    contextDocuments: [
      {
        path: "src/docs/components/form/input-text.md",
        summary: "文本输入框文档",
      },
    ],
  });
  const result = await executor_node(state, mockConfig);
  console.log(
    "✅ Executor Result Schema Snippet:",
    JSON.stringify(result.schema, null, 2),
  );
}

/**
 * 测试 Composer Node
 */
async function testComposer() {
  console.log("\n--- Testing Composer Node ---");
  const mockTasks = [
    {
      id: "task-1",
      description:
        "创建一个包含标题和描述的页面容器，用于展示社交媒体数据分析报告",
      type: "page",
      priority: 1,
      docPaths: ["src\\docs\\components\\page.md"],
      status: "completed",
      result:
        '```json\n{\n  "type": "page",\n  "title": "社交媒体数据分析报告",\n  "name": "socialMediaReportPage",\n  "body": [\n    {\n      "type": "panel",\n      "title": "报告概述",\n      "body": [\n        {\n          "type": "tpl",\n          "tpl": "本报告展示了 YouTube、TikTok 和 Instagram 三个主流社交媒体平台的数据分析结果，包括作品数量分布、互动量分布、账号数量分布以及各平台账号分类统计等关键指标。",\n          "wrapperComponent": "div",\n          "inline": false\n        }\n      ]\n    },\n    {\n      "type": "grid",\n      "columns": [\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "平台作品数量分布",\n                "subTitle": "Platform Works Distribution"\n              },\n              "body": [\n                {\n                  "type": "chart",\n                  "config": {\n                    "title": {\n                      "text": "作品数量分布"\n                    },\n                    "tooltip": {},\n                    "legend": {\n                      "data": ["YouTube", "TikTok", "Instagram"]\n                    },\n                    "series": [\n                      {\n                        "name": "作品数量",\n                        "type": "pie",\n                        "data": [\n                          {"value": 45, "name": "YouTube"},\n                          {"value": 20, "name": "TikTok"},\n                          {"value": 1356, "name": "Instagram"}\n                        ]\n                      }\n                    ]\n                  }\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "平台互动量分布",\n                "subTitle": "Platform Interaction Distribution"\n              },\n              "body": [\n                {\n                  "type": "chart",\n                  "config": {\n                    "title": {\n                      "text": "互动量分布"\n                    },\n                    "tooltip": {},\n                    "legend": {\n                      "data": ["YouTube", "TikTok", "Instagram"]\n                    },\n                    "series": [\n                      {\n                        "name": "互动量",\n                        "type": "pie",\n                        "data": [\n                          {"value": 12930, "name": "YouTube"},\n                          {"value": 13818, "name": "TikTok"},\n                          {"value": 1537641, "name": "Instagram"}\n                        ]\n                      }\n                    ]\n                  }\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "平台账号数量分布",\n                "subTitle": "Platform Account Distribution"\n              },\n              "body": [\n                {\n                  "type": "chart",\n                  "config": {\n                    "title": {\n                      "text": "账号数量分布"\n                    },\n                    "tooltip": {},\n                    "legend": {\n                      "data": ["YouTube", "TikTok", "Instagram"]\n                    },\n                    "series": [\n                      {\n                        "name": "账号数量",\n                        "type": "pie",\n                        "data": [\n                          {"value": 19, "name": "YouTube"},\n                          {"value": 14, "name": "TikTok"},\n                          {"value": 591, "name": "Instagram"}\n                        ]\n                      }\n                    ]\n                  }\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "type": "tabs",\n      "tabs": [\n        {\n          "title": "YouTube 数据分析",\n          "body": [\n            {\n              "type": "crud",\n              "api": "/api/youtube/stats",\n              "columns": [\n                {\n                  "name": "category",\n                  "label": "分类",\n                  "type": "text"\n                },\n                {\n                  "name": "posts",\n                  "label": "作品数",\n                  "type": "text"\n                },\n                {\n                  "name": "accounts",\n                  "label": "账号数",\n                  "type": "text"\n                },\n                {\n                  "name": "interactions",\n                  "label": "互动量",\n                  "type": "text"\n                }\n              ],\n              "data": {\n                "items": [\n                  {"category": "People & Society", "posts": 6070, "accounts": 8, "interactions": 81878},\n                  {"category": "Entertainment", "posts": 480, "accounts": 1, "interactions": 864},\n                  {"category": "Education", "posts": 1000, "accounts": 1, "interactions": 7321},\n                  {"category": "Comedy", "posts": 480, "accounts": 1, "interactions": 9982},\n                  {"category": "Travel & Adventure", "posts": 480, "accounts": 1, "interactions": 29687},\n                  {"category": "How-to & Style", "posts": 11340, "accounts": 7, "interactions": 343591}\n                ]\n              }\n            }\n          ]\n        },\n        {\n          "title": "TikTok 数据分析",\n          "body": [\n            {\n              "type": "crud",\n              "api": "/api/tiktok/stats",\n              "columns": [\n                {\n                  "name": "category",\n                  "label": "分类",\n                  "type": "text"\n                },\n                {\n                  "name": "posts",\n                  "label": "作品数",\n                  "type": "text"\n                },\n                {\n                  "name": "accounts",\n                  "label": "账号数",\n                  "type": "text"\n                },\n                {\n                  "name": "interactions",\n                  "label": "互动量",\n                  "type": "text"\n                }\n              ],\n              "data": {\n                "items": [\n                  {"category": "Fashion & Beauty", "posts": 5620, "accounts": 5, "interactions": 7570954},\n                  {"category": "Lifestyle", "posts": 4080, "accounts": 2, "interactions": 21187637},\n                  {"category": "Comedy", "posts": 17620, "accounts": 1, "interactions": 16353039},\n                  {"category": "Family & Parenting", "posts": 1480, "accounts": 1, "interactions": 2408349},\n                  {"category": "Music & Dance", "posts": 48590, "accounts": 2, "interactions": 41040474},\n                  {"category": "Food & Drink", "posts": 9430, "accounts": 3, "interactions": 16473573}\n                ]\n              }\n            }\n          ]\n        },\n        {\n          "title": "Instagram 数据分析",\n          "body": [\n            {\n              "type": "crud",\n              "api": "/api/instagram/stats",\n              "columns": [\n                {\n                  "name": "category",\n                  "label": "分类",\n                  "type": "text"\n                },\n                {\n                  "name": "posts",\n                  "label": "作品数",\n                  "type": "text"\n                },\n                {\n                  "name": "accounts",\n                  "label": "账号数",\n                  "type": "text"\n                },\n                {\n                  "name": "interactions",\n                  "label": "互动量",\n                  "type": "text"\n                }\n              ],\n              "data": {\n                "items": [\n                  {"category": "Fashion & Beauty", "posts": 1172080, "accounts": 282, "interactions": 344465566},\n                  {"category": "Business & Finance", "posts": 384090, "accounts": 26, "interactions": 24699006},\n                  {"category": "Home & Decor", "posts": 419220, "accounts": 79, "interactions": 37005930},\n                  {"category": "Family & Parenting", "posts": 213280, "accounts": 64, "interactions": 85143348},\n                  {"category": "Food & Drink", "posts": 209130, "accounts": 37, "interactions": 40881204},\n                  {"category": "Travel & Adventure", "posts": 150440, "accounts": 26, "interactions": 20850857},\n                  {"category": "Health & Fitness", "posts": 88120, "accounts": 24, "interactions": 19629710},\n                  {"category": "Comedy", "posts": 110220, "accounts": 16, "interactions": 27736563}\n                ]\n              }\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "type": "panel",\n      "title": "amis-agent 使用指南",\n      "body": [\n        {\n          "type": "tpl",\n          "tpl": "<h3>关于 amis-agent</h3><p>amis-agent 是一个智能的 amis 配置生成助手，能够根据用户需求自动生成符合 amis 规范的 JSON 配置。</p><h4>主要功能：</h4><ul><li>自动解析用户需求并生成对应的 amis 组件配置</li><li>支持多种组件类型：页面、表单、表格、图表等</li><li>遵循 amis',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\page.md",
        },
      ],
    },
    {
      id: "task-2",
      description:
        "实现一个展示平台作品数量分布的统计卡片组件，包含 YouTube, TikTok, Ins 的数据",
      type: "statistic-card",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\card.md",
        "src\\docs\\components\\cards.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "platformWorksNumDistCard",\n  "header": {\n    "title": "平台作品数量分布",\n    "subTitle": "Platform Works Distribution"\n  },\n  "body": [\n    {\n      "type": "grid",\n      "columns": [\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube}</div><div class=\\"text-muted\\">YouTube</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${tiktok}</div><div class=\\"text-muted\\">TikTok</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${ins}</div><div class=\\"text-muted\\">Instagram</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "type": "chart",\n      "api": {\n        "method": "get",\n        "url": "/api/platformWorksNumDist",\n        "data": {\n          "youtube": "${youtube}",\n          "tiktok": "${tiktok}",\n          "ins": "${ins}"\n        }\n      },\n      "config": {\n        "title": {\n          "text": "作品数量分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 14\n          }\n        },\n        "tooltip": {\n          "trigger": "item",\n          "formatter": "{a} <br/>{b}: {c} ({d}%)"\n        },\n        "legend": {\n          "orient": "horizontal",\n          "bottom": "0",\n          "data": ["YouTube", "TikTok", "Instagram"]\n        },\n        "series": [\n          {\n            "name": "作品数量",\n            "type": "pie",\n            "radius": ["40%", "70%"],\n            "avoidLabelOverlap": false,\n            "label": {\n              "show": true,\n              "formatter": "{b}: {c}"\n            },\n            "emphasis": {\n              "label": {\n                "show": true,\n                "fontSize": "14",\n                "fontWeight": "bold"\n              }\n            },\n            "labelLine": {\n              "show": true\n            },\n            "data": [\n              {"value": "${youtube}", "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n              {"value": "${tiktok}", "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n              {"value": "${ins}", "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n            ]\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "300px"\n    }\n  ],\n  "actions": [\n    {\n      "type": "button",\n      "label": "刷新数据",\n      "level": "primary",\n      "icon": "fa fa-refresh",\n      "actionType": "reload",\n      "target": "platformWorksNumDistCard"\n    }\n  ]\n}\n```',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\card.md",
        },
        {
          path: "src\\docs\\components\\cards.md",
        },
      ],
    },
    {
      id: "task-3",
      description:
        "实现一个展示平台互动量分布的统计卡片组件，包含 YouTube, TikTok, Ins 的数据",
      type: "statistic-card",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\card.md",
        "src\\docs\\components\\cards.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "platformInteractiveDistCard",\n  "header": {\n    "title": "平台互动量分布",\n    "subTitle": "Platform Interaction Distribution"\n  },\n  "body": [\n    {\n      "type": "grid",\n      "columns": [\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube | number: \',\'}</div><div class=\\"text-muted\\">YouTube</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${tiktok | number: \',\'}</div><div class=\\"text-muted\\">TikTok</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${ins | number: \',\'}</div><div class=\\"text-muted\\">Instagram</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "type": "chart",\n      "config": {\n        "title": {\n          "text": "互动量分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 14\n          }\n        },\n        "tooltip": {\n          "trigger": "item",\n          "formatter": "{a} <br/>{b}: {c} ({d}%)"\n        },\n        "legend": {\n          "orient": "horizontal",\n          "bottom": "0",\n          "data": ["YouTube", "TikTok", "Instagram"]\n        },\n        "series": [\n          {\n            "name": "互动量",\n            "type": "pie",\n            "radius": ["40%", "70%"],\n            "avoidLabelOverlap": false,\n            "label": {\n              "show": true,\n              "formatter": "{b}: {c}"\n            },\n            "emphasis": {\n              "label": {\n                "show": true,\n                "fontSize": "14",\n                "fontWeight": "bold"\n              }\n            },\n            "labelLine": {\n              "show": true\n            },\n            "data": [\n              {"value": "${youtube}", "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n              {"value": "${tiktok}", "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n              {"value": "${ins}", "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n            ]\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "300px"\n    }\n  ],\n  "actions": [\n    {\n      "type": "button",\n      "label": "刷新数据",\n      "level": "primary",\n      "icon": "fa fa-refresh",\n      "actionType": "reload",\n      "target": "platformInteractiveDistCard"\n    }\n  ]\n}\n```',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\card.md",
        },
        {
          path: "src\\docs\\components\\cards.md",
        },
      ],
    },
    {
      id: "task-4",
      description:
        "实现一个展示平台账号数量分布的统计卡片组件，包含 YouTube, TikTok, Ins 的数据",
      type: "statistic-card",
      priority: 1,
      docPaths: [
        "src\\docs\\components\\card.md",
        "src\\docs\\components\\cards.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "platformAccountNumDistCard",\n  "header": {\n    "title": "平台账号数量分布",\n    "subTitle": "Platform Account Distribution"\n  },\n  "body": [\n    {\n      "type": "grid",\n      "columns": [\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube}</div><div class=\\"text-muted\\">YouTube</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${tiktok}</div><div class=\\"text-muted\\">TikTok</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "md": 4,\n          "body": [\n            {\n              "type": "wrapper",\n              "className": "bg-light p-3 text-center",\n              "body": [\n                {\n                  "type": "tpl",\n                  "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${ins}</div><div class=\\"text-muted\\">Instagram</div>",\n                  "wrapperComponent": "div"\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "type": "chart",\n      "config": {\n        "title": {\n          "text": "账号数量分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 14\n          }\n        },\n        "tooltip": {\n          "trigger": "item",\n          "formatter": "{a} <br/>{b}: {c} ({d}%)"\n        },\n        "legend": {\n          "orient": "horizontal",\n          "bottom": "0",\n          "data": ["YouTube", "TikTok", "Instagram"]\n        },\n        "series": [\n          {\n            "name": "账号数量",\n            "type": "pie",\n            "radius": ["40%", "70%"],\n            "avoidLabelOverlap": false,\n            "label": {\n              "show": true,\n              "formatter": "{b}: {c}"\n            },\n            "emphasis": {\n              "label": {\n                "show": true,\n                "fontSize": "14",\n                "fontWeight": "bold"\n              }\n            },\n            "labelLine": {\n              "show": true\n            },\n            "data": [\n              {"value": "${youtube}", "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n              {"value": "${tiktok}", "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n              {"value": "${ins}", "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n            ]\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "300px"\n    }\n  ],\n  "actions": [\n    {\n      "type": "button",\n      "label": "刷新数据",\n      "level": "primary",\n      "icon": "fa fa-refresh",\n      "actionType": "reload",\n      "target": "platformAccountNumDistCard"\n    }\n  ]\n}\n```',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\card.md",
        },
        {
          path: "src\\docs\\components\\cards.md",
        },
      ],
    },
    {
      id: "task-5",
      description: "创建一个水平排列的布局容器，用于放置上述三个统计卡片",
      type: "hbox",
      priority: 1,
      docPaths: [],
      status: "completed",
      result:
        '```json\n{\n  "type": "hbox",\n  "name": "platformStatsHBox",\n  "columns": [\n    {\n      "type": "card",\n      "name": "platformWorksNumDistCard",\n      "header": {\n        "title": "平台作品数量分布",\n        "subTitle": "Platform Works Distribution"\n      },\n      "body": [\n        {\n          "type": "grid",\n          "columns": [\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube}</div><div class=\\"text-muted\\">YouTube</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${tiktok}</div><div class=\\"text-muted\\">TikTok</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${ins}</div><div class=\\"text-muted\\">Instagram</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "type": "chart",\n          "config": {\n            "title": {\n              "text": "作品数量分布",\n              "left": "center",\n              "textStyle": {\n                "fontSize": 14\n              }\n            },\n            "tooltip": {\n              "trigger": "item",\n              "formatter": "{a} <br/>{b}: {c} ({d}%)"\n            },\n            "legend": {\n              "orient": "horizontal",\n              "bottom": "0",\n              "data": ["YouTube", "TikTok", "Instagram"]\n            },\n            "series": [\n              {\n                "name": "作品数量",\n                "type": "pie",\n                "radius": ["40%", "70%"],\n                "avoidLabelOverlap": false,\n                "label": {\n                  "show": true,\n                  "formatter": "{b}: {c}"\n                },\n                "emphasis": {\n                  "label": {\n                    "show": true,\n                    "fontSize": "14",\n                    "fontWeight": "bold"\n                  }\n                },\n                "labelLine": {\n                  "show": true\n                },\n                "data": [\n                  {"value": "${youtube}", "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n                  {"value": "${tiktok}", "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n                  {"value": "${ins}", "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n                ]\n              }\n            ]\n          },\n          "width": "100%",\n          "height": "300px"\n        }\n      ],\n      "actions": [\n        {\n          "type": "button",\n          "label": "刷新数据",\n          "level": "primary",\n          "icon": "fa fa-refresh",\n          "actionType": "reload",\n          "target": "platformWorksNumDistCard"\n        }\n      ]\n    },\n    {\n      "type": "card",\n      "name": "platformInteractiveDistCard",\n      "header": {\n        "title": "平台互动量分布",\n        "subTitle": "Platform Interaction Distribution"\n      },\n      "body": [\n        {\n          "type": "grid",\n          "columns": [\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube | number: \',\'}</div><div class=\\"text-muted\\">YouTube</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${tiktok | number: \',\'}</div><div class=\\"text-muted\\">TikTok</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${ins | number: \',\'}</div><div class=\\"text-muted\\">Instagram</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            }\n          ]\n        },\n        {\n          "type": "chart",\n          "config": {\n            "title": {\n              "text": "互动量分布",\n              "left": "center",\n              "textStyle": {\n                "fontSize": 14\n              }\n            },\n            "tooltip": {\n              "trigger": "item",\n              "formatter": "{a} <br/>{b}: {c} ({d}%)"\n            },\n            "legend": {\n              "orient": "horizontal",\n              "bottom": "0",\n              "data": ["YouTube", "TikTok", "Instagram"]\n            },\n            "series": [\n              {\n                "name": "互动量",\n                "type": "pie",\n                "radius": ["40%", "70%"],\n                "avoidLabelOverlap": false,\n                "label": {\n                  "show": true,\n                  "formatter": "{b}: {c}"\n                },\n                "emphasis": {\n                  "label": {\n                    "show": true,\n                    "fontSize": "14",\n                    "fontWeight": "bold"\n                  }\n                },\n                "labelLine": {\n                  "show": true\n                },\n                "data": [\n                  {"value": "${youtube}", "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n                  {"value": "${tiktok}", "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n                  {"value": "${ins}", "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n                ]\n              }\n            ]\n          },\n          "width": "100%",\n          "height": "300px"\n        }\n      ],\n      "actions": [\n        {\n          "type": "button",\n          "label": "刷新数据",\n          "level": "primary",\n          "icon": "fa fa-refresh",\n          "actionType": "reload",\n          "target": "platformInteractiveDistCard"\n        }\n      ]\n    },\n    {\n      "type": "card",\n      "name": "platformAccountNumDistCard",\n      "header": {\n        "title": "平台账号数量分布",\n        "subTitle": "Platform Account Distribution"\n      },\n      "body": [\n        {\n          "type": "grid",\n          "columns": [\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${youtube}</div><div class=\\"text-muted\\">YouTube</div>",\n                      "wrapperComponent": "div"\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "md": 4,\n              "body": [\n                {\n                  "type": "wrapper",\n                  "className": "bg-light p-3 text-center",\n                  "body": [\n                    {\n                      "type": "tpl",\n                      "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA',
      retryCount: 0,
    },
    {
      id: "task-6",
      description:
        "实现一个展示 YouTube 账号分类统计的图表组件，包含分类、K级、账号数等维度",
      type: "chart",
      priority: 2,
      docPaths: [
        "src\\docs\\components\\chart.md",
        "src\\docs\\components\\form\\chart-radios.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "youtubeAccountCatStatsCard",\n  "header": {\n    "title": "YouTube 账号分类统计",\n    "subTitle": "YouTube Account Category Statistics"\n  },\n  "body": [\n    {\n      "type": "chart",\n      "name": "youtubeCategoryChart",\n      "config": {\n        "title": {\n          "text": "YouTube 账号分类分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 16,\n            "fontWeight": "bold"\n          }\n        },\n        "tooltip": {\n          "trigger": "axis",\n          "axisPointer": {\n            "type": "shadow"\n          },\n          "formatter": "{b}<br/>作品数: {c0}<br/>账号数: {c1}<br/>互动量: {c2}"\n        },\n        "legend": {\n          "data": ["作品数", "账号数", "互动量"],\n          "top": "30"\n        },\n        "grid": {\n          "left": "3%",\n          "right": "4%",\n          "bottom": "3%",\n          "containLabel": true\n        },\n        "xAxis": {\n          "type": "category",\n          "data": ["People & Society", "Entertainment", "Education", "Comedy", "Travel & Adventure", "How-to & Style"],\n          "axisLabel": {\n            "rotate": 30,\n            "interval": 0\n          }\n        },\n        "yAxis": [\n          {\n            "type": "value",\n            "name": "作品数/账号数",\n            "position": "left",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          },\n          {\n            "type": "value",\n            "name": "互动量",\n            "position": "right",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          }\n        ],\n        "series": [\n          {\n            "name": "作品数",\n            "type": "bar",\n            "data": [6070, 480, 1000, 480, 480, 11340],\n            "itemStyle": {\n              "color": "#FF0000"\n            },\n            "label": {\n              "show": true,\n              "position": "top"\n            }\n          },\n          {\n            "name": "账号数",\n            "type": "bar",\n            "data": [8, 1, 1, 1, 1, 7],\n            "itemStyle": {\n              "color": "#FF6B6B"\n            },\n            "label": {\n              "show": true,\n              "position": "top"\n            }\n          },\n          {\n            "name": "互动量",\n            "type": "line",\n            "yAxisIndex": 1,\n            "data": [81878, 864, 7321, 9982, 29687, 343591],\n            "itemStyle": {\n              "color": "#FFD700"\n            },\n            "label": {\n              "show": true,\n              "position": "right",\n              "formatter": "{c}"\n            }\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "400px"\n    },\n    {\n      "type": "panel",\n      "title": "K级账号分布详情",\n      "body": [\n        {\n          "type": "chart",\n          "name": "youtubeKLChart",\n          "config": {\n            "title": {\n              "text": "K级账号分布",\n              "left": "center",\n              "textStyle": {\n                "fontSize": 14\n              }\n            },\n            "tooltip": {\n              "trigger": "item",\n              "formatter": "{a} <br/>{b}: {c} 个账号 ({d}%)"\n            },\n            "legend": {\n              "orient": "vertical",\n              "left": "left",\n              "data": ["MicroInfluencer", "Mid-tierInfluencer"]\n            },\n            "series": [\n              {\n                "name": "K级分布",\n                "type": "pie",\n                "radius": "55%",\n                "center": ["50%", "50%"],\n                "data": [\n                  {\n                    "value": 16,\n                    "name": "MicroInfluencer",\n                    "itemStyle": {\n                      "color": "#4ECDC4"\n                    }\n                  },\n                  {\n                    "value": 3,\n                    "name": "Mid-tierInfluencer",\n                    "itemStyle": {\n                      "color": "#45B7D1"\n                    }\n                  }\n                ],\n                "emphasis": {\n                  "itemStyle": {\n                    "shadowBlur": 10,\n                    "shadowOffsetX": 0,\n                    "shadowColor": "rgba(0, 0, 0, 0.5)"\n                  }\n                },\n                "label": {\n                  "show": true,\n                  "formatter": "{b}: {c}个\\n({d}%)"\n                }\n              }\n            ]\n          },\n          "width": "100%",\n          "height": "300px"\n        }\n      ]\n    },\n    {\n      "type": "crud",\n      "name": "youtubeCategoryTable",\n      "api": "/api/youtube/category-stats",\n      "columns": [\n        {\n          "name": "category",\n          "label": "分类",\n          "type": "text",\n          "width": 150\n        },\n        {\n          "name": "posts",\n          "label": "作品数",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "accounts",\n          "label": "账号数",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "interactions",\n          "label": "互动量",\n          "type": "text",\n          "width": 120\n        },\n        {\n          "name": "kl_distribution",\n          "label": "K级分布",\n          "type": "tpl",\n          "tpl": "${kl | json}",\n          "width": 200\n        }\n      ],\n      "data": {\n        "items": [\n          {\n            "category": "People & Society",\n            "posts": 6070,\n            "accounts": 8,\n            "interactions": 81878,\n            "kl": {\n              "MicroInfluencer": {\n                "posts": 6070,\n                "count": 8,\n                "interactions": 81878\n              }\n            }\n          },\n          {\n            "category": "Entertainment",\n            "posts": 480,\n            "accounts": 1,\n            "interactions": 864,\n            "kl": {\n              "MicroInfluencer": {\n                "posts": 480,\n                "count": 1,\n                "interactions": 864\n              }\n            }\n          },\n          {\n            "category": "Education",\n            "posts": 1000,\n            "accounts": 1,\n            "interactions": 7321,\n            "kl": {\n              "MicroInfluencer": {\n                "posts": 1000,\n                "count": 1,\n                "interactions": 7321\n              }\n            }\n          },\n          {\n            "category": "Comedy",\n            "posts": 480,\n            "accounts": 1,\n            "interactions": 9982,\n            "kl": {\n              "MicroInfluencer": {\n                "posts": 480,\n                "count": 1,\n                "interactions": 9982\n              }\n            }\n          },\n          {\n            "category": "Travel & Adventure",\n            "posts": 480,\n            "accounts": 1,\n            "interactions": 29687,\n            "kl": {\n              "MicroInfluencer": {\n                "posts": 480,\n                "count": 1,\n                "interactions": 29687\n              }\n            }\n          },\n          {\n            "category": "How-to & Style",\n            "posts": 11340,\n            "accounts": 7,\n            "interactions": 343591,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "posts": 8470,\n                "count": 3,\n                "interactions": 322547\n              },\n              "MicroInfluencer": {\n                "posts": 2870,\n                "count": 4,\n                "interactions": 21044\n              }\n            }\n          }\n        ]\n      },\n      "perPage": 10,\n      "filter": {\n        "title": "筛选条件",\n        "submitText": "查询",\n        "controls": [\n          {\n            "type": "select",\n            "name": "category",\n            "label": "分类",\n            "options": [\n              {\n                "label": "全部",\n                "value": "all"\n              },\n              {\n                "label": "People & Society",\n                "value": "People & Society"\n              },\n              {\n                "label": "Entertainment",\n                "value": "Entertainment"\n              },\n              {\n                "label": "Education",\n                "value": "Education"\n              },\n              {\n                "label": "Comedy",\n                "value": "Comedy"\n              },\n              {\n                "label": "Travel & Adventure",\n                "value": "Travel & Adventure"\n              },\n              {\n                "label": "How-to & Style",\n                "value": "How',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\chart.md",
        },
        {
          path: "src\\docs\\components\\form\\chart-radios.md",
        },
      ],
    },
    {
      id: "task-7",
      description:
        "实现一个展示 TikTok 账号分类统计的图表组件，包含分类、K级、账号数等维度",
      type: "chart",
      priority: 2,
      docPaths: [
        "src\\docs\\components\\chart.md",
        "src\\docs\\components\\form\\chart-radios.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "tiktokAccountCatStatsCard",\n  "header": {\n    "title": "TikTok 账号分类统计",\n    "subTitle": "TikTok Account Category Statistics"\n  },\n  "body": [\n    {\n      "type": "chart",\n      "name": "tiktokCategoryChart",\n      "config": {\n        "title": {\n          "text": "TikTok 账号分类分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 16,\n            "fontWeight": "bold"\n          }\n        },\n        "tooltip": {\n          "trigger": "axis",\n          "axisPointer": {\n            "type": "shadow"\n          },\n          "formatter": "{b}<br/>作品数: {c0}<br/>账号数: {c1}<br/>互动量: {c2}"\n        },\n        "legend": {\n          "data": ["作品数", "账号数", "互动量"],\n          "top": "30"\n        },\n        "grid": {\n          "left": "3%",\n          "right": "4%",\n          "bottom": "3%",\n          "containLabel": true\n        },\n        "xAxis": {\n          "type": "category",\n          "data": ["Fashion & Beauty", "Lifestyle", "Comedy", "Family & Parenting", "Music & Dance", "Food & Drink"],\n          "axisLabel": {\n            "rotate": 30,\n            "interval": 0\n          }\n        },\n        "yAxis": [\n          {\n            "type": "value",\n            "name": "作品数/账号数",\n            "position": "left",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          },\n          {\n            "type": "value",\n            "name": "互动量",\n            "position": "right",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          }\n        ],\n        "series": [\n          {\n            "name": "作品数",\n            "type": "bar",\n            "data": [5620, 4080, 17620, 1480, 48590, 9430],\n            "itemStyle": {\n              "color": "#00F2EA"\n            },\n            "label": {\n              "show": true,\n              "position": "top"\n            }\n          },\n          {\n            "name": "账号数",\n            "type": "bar",\n            "data": [5, 2, 1, 1, 2, 3],\n            "itemStyle": {\n              "color": "#FF0050"\n            },\n            "label": {\n              "show": true,\n              "position": "top"\n            }\n          },\n          {\n            "name": "互动量",\n            "type": "line",\n            "yAxisIndex": 1,\n            "data": [7570954, 21187637, 16353039, 2408349, 41040474, 16473573],\n            "itemStyle": {\n              "color": "#00F2EA"\n            },\n            "label": {\n              "show": false,\n              "position": "right",\n              "formatter": "{c}"\n            }\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "400px"\n    },\n    {\n      "type": "panel",\n      "title": "K级账号分布详情",\n      "body": [\n        {\n          "type": "chart",\n          "name": "tiktokKLChart",\n          "config": {\n            "title": {\n              "text": "K级账号分布",\n              "left": "center",\n              "textStyle": {\n                "fontSize": 14\n              }\n            },\n            "tooltip": {\n              "trigger": "item",\n              "formatter": "{a} <br/>{b}: {c} 个账号 ({d}%)"\n            },\n            "legend": {\n              "orient": "vertical",\n              "left": "left",\n              "data": ["MicroInfluencer", "Mid-tierInfluencer", "MacroInfluencer", "MegaInfluencer"]\n            },\n            "series": [\n              {\n                "name": "K级分布",\n                "type": "pie",\n                "radius": "55%",\n                "center": ["50%", "50%"],\n                "data": [\n                  {\n                    "value": 5,\n                    "name": "MicroInfluencer",\n                    "itemStyle": {\n                      "color": "#4ECDC4"\n                    }\n                  },\n                  {\n                    "value": 7,\n                    "name": "Mid-tierInfluencer",\n                    "itemStyle": {\n                      "color": "#45B7D1"\n                    }\n                  },\n                  {\n                    "value": 1,\n                    "name": "MacroInfluencer",\n                    "itemStyle": {\n                      "color": "#FF6B6B"\n                    }\n                  },\n                  {\n                    "value": 1,\n                    "name": "MegaInfluencer",\n                    "itemStyle": {\n                      "color": "#FFD93D"\n                    }\n                  }\n                ],\n                "emphasis": {\n                  "itemStyle": {\n                    "shadowBlur": 10,\n                    "shadowOffsetX": 0,\n                    "shadowColor": "rgba(0, 0, 0, 0.5)"\n                  }\n                },\n                "label": {\n                  "show": true,\n                  "formatter": "{b}: {c}个\\n({d}%)"\n                }\n              }\n            ]\n          },\n          "width": "100%",\n          "height": "300px"\n        }\n      ]\n    },\n    {\n      "type": "crud",\n      "name": "tiktokCategoryTable",\n      "api": "/api/tiktok/category-stats",\n      "columns": [\n        {\n          "name": "category",\n          "label": "分类",\n          "type": "text",\n          "width": 150\n        },\n        {\n          "name": "posts",\n          "label": "作品数(p)",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "accounts",\n          "label": "账号数(c)",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "interactions",\n          "label": "互动量(i)",\n          "type": "text",\n          "width": 120\n        },\n        {\n          "name": "kl_distribution",\n          "label": "K级分布",\n          "type": "tpl",\n          "tpl": "${kl | json}",\n          "width": 200\n        }\n      ],\n      "data": {\n        "items": [\n          {\n            "category": "Fashion & Beauty",\n            "posts": 5620,\n            "accounts": 5,\n            "interactions": 7570954,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "p": 3110,\n                "c": 2,\n                "i": 2721420\n              },\n              "MicroInfluencer": {\n                "p": 2510,\n                "c": 3,\n                "i": 4849534\n              }\n            }\n          },\n          {\n            "category": "Lifestyle",\n            "posts": 4080,\n            "accounts": 2,\n            "interactions": 21187637,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "p": 3350,\n                "c": 1,\n                "i": 19574401\n              },\n              "MicroInfluencer": {\n                "p": 730,\n                "c": 1,\n                "i": 1613236\n              }\n            }\n          },\n          {\n            "category": "Comedy",\n            "posts": 17620,\n            "accounts": 1,\n            "interactions": 16353039,\n            "kl": {\n              "MacroInfluencer": {\n                "p": 17620,\n                "c": 1,\n                "i": 16353039\n              }\n            }\n          },\n          {\n            "category": "Family & Parenting",\n            "posts": 1480,\n            "accounts": 1,\n            "interactions": 2408349,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "p": 1480,\n                "c": 1,\n                "i": 2408349\n              }\n            }\n          },\n          {\n            "category": "Music & Dance",\n            "posts": 48590,\n            "accounts": 2,\n            "interactions": 41040474,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "p": 3590,\n                "c": 1,\n                "i": 9913817\n              },\n              "MegaInfluencer": {\n                "p": 45000,\n                "c": 1,\n                "i": 31126657\n              }\n            }\n          },\n          {\n            "category": "Food & Drink",\n            "posts": 9430,\n            "accounts": 3,\n            "interactions": 16473573,\n            "kl": {\n              "Mid-tierInfluencer": {\n                "p": 7810,\n                "',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\chart.md",
        },
        {
          path: "src\\docs\\components\\form\\chart-radios.md",
        },
      ],
    },
    {
      id: "task-8",
      description:
        "实现一个展示 Ins 账号分类统计的图表组件，包含分类、K级、账号数等维度",
      type: "chart",
      priority: 2,
      docPaths: [
        "src\\docs\\components\\chart.md",
        "src\\docs\\components\\form\\chart-radios.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "card",\n  "name": "insAccountCatStatsCard",\n  "header": {\n    "title": "Instagram 账号分类统计",\n    "subTitle": "Instagram Account Category Statistics"\n  },\n  "body": [\n    {\n      "type": "chart",\n      "name": "insCategoryChart",\n      "config": {\n        "title": {\n          "text": "Instagram 账号分类分布",\n          "left": "center",\n          "textStyle": {\n            "fontSize": 16,\n            "fontWeight": "bold"\n          }\n        },\n        "tooltip": {\n          "trigger": "axis",\n          "axisPointer": {\n            "type": "shadow"\n          },\n          "formatter": "{b}<br/>作品数: {c0}<br/>账号数: {c1}<br/>互动量: {c2}"\n        },\n        "legend": {\n          "data": ["作品数", "账号数", "互动量"],\n          "top": "30"\n        },\n        "grid": {\n          "left": "3%",\n          "right": "4%",\n          "bottom": "3%",\n          "containLabel": true\n        },\n        "xAxis": {\n          "type": "category",\n          "data": ["Fashion&Beauty", "Business&Finance", "Home&Decor", "Family&Parenting", "Food&Drink", "Travel&Adventure", "Health&Fitness", "Comedy"],\n          "axisLabel": {\n            "rotate": 30,\n            "interval": 0\n          }\n        },\n        "yAxis": [\n          {\n            "type": "value",\n            "name": "作品数/账号数",\n            "position": "left",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          },\n          {\n            "type": "value",\n            "name": "互动量",\n            "position": "right",\n            "axisLabel": {\n              "formatter": "{value}"\n            }\n          }\n        ],\n        "series": [\n          {\n            "name": "作品数",\n            "type": "bar",\n            "data": [1172080, 384090, 419220, 213280, 209130, 150440, 88120, 110220],\n            "itemStyle": {\n              "color": "#E1306C"\n            },\n            "label": {\n              "show": false,\n              "position": "top"\n            }\n          },\n          {\n            "name": "账号数",\n            "type": "bar",\n            "data": [282, 26, 79, 64, 37, 26, 24, 16],\n            "itemStyle": {\n              "color": "#F77737"\n            },\n            "label": {\n              "show": true,\n              "position": "top"\n            }\n          },\n          {\n            "name": "互动量",\n            "type": "line",\n            "yAxisIndex": 1,\n            "data": [344465566, 24699006, 37005930, 85143348, 40881204, 20850857, 19629710, 27736563],\n            "itemStyle": {\n              "color": "#FCAF45"\n            },\n            "label": {\n              "show": false,\n              "position": "right"\n            }\n          }\n        ]\n      },\n      "width": "100%",\n      "height": "400px"\n    },\n    {\n      "type": "panel",\n      "title": "K级账号分布详情",\n      "body": [\n        {\n          "type": "chart",\n          "name": "insKLChart",\n          "config": {\n            "title": {\n              "text": "K级账号分布",\n              "left": "center",\n              "textStyle": {\n                "fontSize": 14\n              }\n            },\n            "tooltip": {\n              "trigger": "item",\n              "formatter": "{a} <br/>{b}: {c} 个账号 ({d}%)"\n            },\n            "legend": {\n              "orient": "vertical",\n              "left": "left",\n              "data": ["MicroInfluencer", "Mid-tierInfluencer", "MacroInfluencer", "MegaInfluencer"]\n            },\n            "series": [\n              {\n                "name": "K级分布",\n                "type": "pie",\n                "radius": "55%",\n                "center": ["50%", "50%"],\n                "data": [\n                  {\n                    "value": 278,\n                    "name": "MicroInfluencer",\n                    "itemStyle": {\n                      "color": "#4ECDC4"\n                    }\n                  },\n                  {\n                    "value": 256,\n                    "name": "Mid-tierInfluencer",\n                    "itemStyle": {\n                      "color": "#45B7D1"\n                    }\n                  },\n                  {\n                    "value": 27,\n                    "name": "MacroInfluencer",\n                    "itemStyle": {\n                      "color": "#FF6B6B"\n                    }\n                  },\n                  {\n                    "value": 30,\n                    "name": "MegaInfluencer",\n                    "itemStyle": {\n                      "color": "#FFD93D"\n                    }\n                  }\n                ],\n                "emphasis": {\n                  "itemStyle": {\n                    "shadowBlur": 10,\n                    "shadowOffsetX": 0,\n                    "shadowColor": "rgba(0, 0, 0, 0.5)"\n                  }\n                },\n                "label": {\n                  "show": true,\n                  "formatter": "{b}: {c}个\\n({d}%)"\n                }\n              }\n            ]\n          },\n          "width": "100%",\n          "height": "300px"\n        }\n      ]\n    },\n    {\n      "type": "crud",\n      "name": "insCategoryTable",\n      "api": "/api/ins/category-stats",\n      "columns": [\n        {\n          "name": "category",\n          "label": "分类",\n          "type": "text",\n          "width": 150\n        },\n        {\n          "name": "posts",\n          "label": "作品数",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "accounts",\n          "label": "账号数",\n          "type": "text",\n          "width": 100\n        },\n        {\n          "name": "interactions",\n          "label": "互动量",\n          "type": "text",\n          "width": 120\n        },\n        {\n          "name": "kl_distribution",\n          "label": "K级分布",\n          "type": "tpl",\n          "tpl": "${kl | json}",\n          "width": 200\n        }\n      ],\n      "data": {\n        "items": [\n          {\n            "category": "Fashion&Beauty",\n            "posts": 1172080,\n            "accounts": 282,\n            "interactions": 344465566,\n            "kl": {\n              "MegaInfluencer": {\n                "p": 417900,\n                "c": 14,\n                "i": 204287758\n              },\n              "MacroInfluencer": {\n                "p": 150390,\n                "c": 13,\n                "i": 22773033\n              },\n              "Mid-tierInfluencer": {\n                "p": 461870,\n                "c": 103,\n                "i": 97472713\n              },\n              "MicroInfluencer": {\n                "p": 141920,\n                "c": 152,\n                "i": 19932062\n              }\n            }\n          },\n          {\n            "category": "Business&Finance",\n            "posts": 384090,\n            "accounts": 26,\n            "interactions": 24699006,\n            "kl": {\n              "MegaInfluencer": {\n                "p": 293510,\n                "c": 3,\n                "i": 19069242\n              },\n              "MacroInfluencer": {\n                "p": 9940,\n                "c": 1,\n                "i": 975449\n              },\n              "Mid-tierInfluencer": {\n                "p": 52410,\n                "c": 7,\n                "i": 4037958\n              },\n              "MicroInfluencer": {\n                "p": 28230,\n                "c": 15,\n                "i": 616357\n              }\n            }\n          },\n          {\n            "category": "Home&Decor",\n            "posts": 419220,\n            "accounts": 79,\n            "interactions": 37005930,\n            "kl": {\n              "MacroInfluencer": {\n                "p": 88130,\n                "c": 5,\n                "i": 5115280\n              },\n              "Mid-tierInfluencer": {\n                "p": 279880,\n                "c": 41,\n                "i": 28610903\n              },\n              "MicroInfluencer": {\n                "p": 51210,\n                "c": 33,\n                "i": 3279747\n              }\n            }\n          },\n          {\n            "category": "Family&Parenting",\n           ',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\chart.md",
        },
        {
          path: "src\\docs\\components\\form\\chart-radios.md",
        },
      ],
    },
    {
      id: "task-9",
      description:
        "创建一个包含 Tabs 选项卡的容器，分别对应 YouTube, TikTok, Ins 三个平台",
      type: "tabs",
      priority: 2,
      docPaths: [
        "src\\docs\\components\\form\\tabs-transfer-picker.md",
        "src\\docs\\components\\form\\tabs-transfer.md",
        "src\\docs\\components\\tabs.md",
      ],
      status: "completed",
      result:
        '```json\n{\n  "type": "tabs",\n  "name": "platformTabs",\n  "tabs": [\n    {\n      "title": "YouTube",\n      "icon": "fa fa-youtube",\n      "body": [\n        {\n          "type": "service",\n          "api": {\n            "method": "get",\n            "url": "/api/youtube/data"\n          },\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "YouTube 数据概览",\n                "subTitle": "YouTube Data Overview"\n              },\n              "body": [\n                {\n                  "type": "grid",\n                  "columns": [\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${works}</div><div class=\\"text-muted\\">作品数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-users\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${accounts}</div><div class=\\"text-muted\\">账号数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-heart\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">${interactions}</div><div class=\\"text-muted\\">互动量</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    }\n                  ]\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "title": "TikTok",\n      "icon": "fa fa-music",\n      "body": [\n        {\n          "type": "service",\n          "api": {\n            "method": "get",\n            "url": "/api/tiktok/data"\n          },\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "TikTok 数据概览",\n                "subTitle": "TikTok Data Overview"\n              },\n              "body": [\n                {\n                  "type": "grid",\n                  "columns": [\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${works}</div><div class=\\"text-muted\\">作品数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-users\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${accounts}</div><div class=\\"text-muted\\">账号数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-heart\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">${interactions}</div><div class=\\"text-muted\\">互动量</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    }\n                  ]\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    },\n    {\n      "title": "Instagram",\n      "icon": "fa fa-instagram",\n      "body": [\n        {\n          "type": "service",\n          "api": {\n            "method": "get",\n            "url": "/api/instagram/data"\n          },\n          "body": [\n            {\n              "type": "card",\n              "header": {\n                "title": "Instagram 数据概览",\n                "subTitle": "Instagram Data Overview"\n              },\n              "body": [\n                {\n                  "type": "grid",\n                  "columns": [\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${works}</div><div class=\\"text-muted\\">作品数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-users\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${accounts}</div><div class=\\"text-muted\\">账号数</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    },\n                    {\n                      "md": 4,\n                      "body": [\n                        {\n                          "type": "wrapper",\n                          "className": "bg-light p-3 text-center",\n                          "body": [\n                            {\n                              "type": "tpl",\n                              "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-heart\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">${interactions}</div><div class=\\"text-muted\\">互动量</div>",\n                              "wrapperComponent": "div"\n                            }\n                          ]\n                        }\n                      ]\n                    }\n                  ]\n                }\n              ]\n            }\n          ]\n        }\n      ]\n    }\n  ],\n  "tabsMode": "line",\n  "activeKey": 0,\n  "className": "platform-tabs-container"\n}\n```',
      retryCount: 0,
      docHints: [
        {
          path: "src\\docs\\components\\form\\tabs-transfer-picker.md",
        },
        {
          path: "src\\docs\\components\\form\\tabs-transfer.md",
        },
        {
          path: "src\\docs\\components\\tabs.md",
        },
      ],
    },
    {
      id: "task-10",
      description:
        "组装所有组件，将统计卡片区域和图表选项卡区域整合到页面中，形成完整的数据报告页面",
      type: "page-assembly",
      priority: 3,
      docPaths: [],
      status: "completed",
      result:
        '```json\n{\n  "type": "page",\n  "title": "社交媒体数据分析报告",\n  "name": "socialMediaReportPage",\n  "body": [\n    {\n      "type": "panel",\n      "title": "报告概述",\n      "body": [\n        {\n          "type": "tpl",\n          "tpl": "本报告展示了 YouTube、TikTok 和 Instagram 三个主流社交媒体平台的数据分析结果，包括作品数量分布、互动量分布、账号数量分布以及各平台账号分类统计等关键指标。",\n          "wrapperComponent": "div"\n        }\n      ]\n    },\n    {\n      "type": "hbox",\n      "columns": [\n        {\n          "type": "card",\n          "name": "platformWorksNumDistCard",\n          "header": {\n            "title": "平台作品数量分布",\n            "subTitle": "Platform Works Distribution"\n          },\n          "body": [\n            {\n              "type": "grid",\n              "columns": [\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">45</div><div class=\\"text-muted\\">YouTube</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">20</div><div class=\\"text-muted\\">TikTok</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">1356</div><div class=\\"text-muted\\">Instagram</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "type": "chart",\n              "config": {\n                "title": {\n                  "text": "作品数量分布",\n                  "left": "center",\n                  "textStyle": {\n                    "fontSize": 14\n                  }\n                },\n                "tooltip": {\n                  "trigger": "item",\n                  "formatter": "{a} <br/>{b}: {c} ({d}%)"\n                },\n                "legend": {\n                  "orient": "horizontal",\n                  "bottom": "0",\n                  "data": ["YouTube", "TikTok", "Instagram"]\n                },\n                "series": [\n                  {\n                    "name": "作品数量",\n                    "type": "pie",\n                    "radius": ["40%", "70%"],\n                    "avoidLabelOverlap": false,\n                    "label": {\n                      "show": true,\n                      "formatter": "{b}: {c}"\n                    },\n                    "data": [\n                      {"value": 45, "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n                      {"value": 20, "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n                      {"value": 1356, "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n                    ]\n                  }\n                ]\n              },\n              "width": "100%",\n              "height": "300px"\n            }\n          ]\n        },\n        {\n          "type": "card",\n          "name": "platformInteractiveDistCard",\n          "header": {\n            "title": "平台互动量分布",\n            "subTitle": "Platform Interaction Distribution"\n          },\n          "body": [\n            {\n              "type": "grid",\n              "columns": [\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">12,930</div><div class=\\"text-muted\\">YouTube</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">13,818</div><div class=\\"text-muted\\">TikTok</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-instagram\\" style=\\"color: #E1306C;\\"></i></div><div class=\\"h4 mb-1\\">1,537,641</div><div class=\\"text-muted\\">Instagram</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                }\n              ]\n            },\n            {\n              "type": "chart",\n              "config": {\n                "title": {\n                  "text": "互动量分布",\n                  "left": "center",\n                  "textStyle": {\n                    "fontSize": 14\n                  }\n                },\n                "tooltip": {\n                  "trigger": "item",\n                  "formatter": "{a} <br/>{b}: {c} ({d}%)"\n                },\n                "legend": {\n                  "orient": "horizontal",\n                  "bottom": "0",\n                  "data": ["YouTube", "TikTok", "Instagram"]\n                },\n                "series": [\n                  {\n                    "name": "互动量",\n                    "type": "pie",\n                    "radius": ["40%", "70%"],\n                    "avoidLabelOverlap": false,\n                    "label": {\n                      "show": true,\n                      "formatter": "{b}: {c}"\n                    },\n                    "data": [\n                      {"value": 12930, "name": "YouTube", "itemStyle": {"color": "#FF0000"}},\n                      {"value": 13818, "name": "TikTok", "itemStyle": {"color": "#00F2EA"}},\n                      {"value": 1537641, "name": "Instagram", "itemStyle": {"color": "#E1306C"}}\n                    ]\n                  }\n                ]\n              },\n              "width": "100%",\n              "height": "300px"\n            }\n          ]\n        },\n        {\n          "type": "card",\n          "name": "platformAccountNumDistCard",\n          "header": {\n            "title": "平台账号数量分布",\n            "subTitle": "Platform Account Distribution"\n          },\n          "body": [\n            {\n              "type": "grid",\n              "columns": [\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-youtube\\" style=\\"color: #FF0000;\\"></i></div><div class=\\"h4 mb-1\\">19</div><div class=\\"text-muted\\">YouTube</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"h3 mb-2\\"><i class=\\"fa fa-music\\" style=\\"color: #00F2EA;\\"></i></div><div class=\\"h4 mb-1\\">14</div><div class=\\"text-muted\\">TikTok</div>",\n                          "wrapperComponent": "div"\n                        }\n                      ]\n                    }\n                  ]\n                },\n                {\n                  "md": 4,\n                  "body": [\n                    {\n                      "type": "wrapper",\n                      "className": "bg-light p-3 text-center",\n                      "body": [\n                        {\n                          "type": "tpl",\n                          "tpl": "<div class=\\"',
      retryCount: 0,
      docHints: [],
    },
  ];
  const state = createMockState({ tasks: mockTasks });
  const result = await composer_node(state, mockConfig);
  console.log(
    "✅ Composer Final Schema:",
    JSON.stringify(result.schema, null, 2),
  );
}

async function main() {
  const node = process.argv[2];

  try {
    switch (node) {
      case "planner":
        await testPlanner();
        break;
      case "planner-data":
        await testPlannerWithData();
        break;
      case "planner-sales":
        await testPlannerSales();
        break;
      case "docs":
        await testDocsAssociate();
        break;
      case "executor":
        await testExecutor();
        break;
      case "composer":
        await testComposer();
        break;
      case "all":
      case undefined:
        console.log("Running all tests in sequence...");
        const tasks = await testPlanner();
        if (tasks) {
          await testDocsAssociate();
          await testExecutor();
          await testComposer();
        }
        break;
      default:
        console.error(
          `Unknown node: ${node}. Available: planner, docs, executor, composer, all`,
        );
        process.exit(1);
    }
    console.log(`\n✨ ${node || "all"} test(s) finished.`);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
