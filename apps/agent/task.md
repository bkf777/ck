# LangGraph 复杂任务规划与执行系统设计文档

## 📋 项目概述

### 目标

设计并实现一个基于 LangGraph 的复杂任务规划与执行系统，用于根据用户需求生成高质量的 amis JSON 配置。

### 核心特性

- ✅ **任务自动规划**：将用户需求拆分成可执行的子任务
- ✅ **文档驱动执行**：根据 amis 官方文档生成符合规范的 JSON
- ✅ **流式输出**：实时展示任务执行进度和生成内容
- ✅ **用户反馈机制**：支持用户审核、修改、优化生成结果
- ✅ **智能路由**：根据反馈动态调整执行流程

### 参考文件

- 现有实现：`src/agent.ts`
- amis 文档：`docs/index.md` 及相关组件文档

---

## 🏗️ 系统架构

### 工作流程图

```
用户需求 → [任务规划节点] → [任务队列]
                         ↓
              [任务执行循环] ← → [文档检索工具]
                         ↓ (流式输出每个步骤)
              [用户反馈节点] ← ← ← ← ← ← ← ←
              ↑    ↓                                ↓
              │  满意？                              ↓
              └─────────── [否：调整重执行]           ↓
                         ↓                      [是]
              [结果综合节点] → 最终 amis JSON
```

### 核心节点设计

#### 1. 任务规划节点 (Planner Node)

**职责**：分析用户需求，生成结构化的子任务列表

**输入**：

- 用户原始需求（如"帮我写一个登录表单"）
- amis 文档索引信息

**输出**：

- 任务列表数组，每个任务包含：
  - `id`: 唯一标识符
  - `description`: 任务描述
  - `type`: 任务类型（如 "form-item-input-text"）
  - `priority`: 优先级
  - `docPaths`: 相关文档路径
  - `status`: 执行状态

**示例**：

```typescript
// 输入：用户说"帮我写一个登录表单"
// 输出：
[
  {
    id: "task-1",
    description: "生成用户名输入框",
    type: "form-item-input-text",
    priority: 1,
    docPaths: ["docs/components/form/input-text.md"],
    status: "pending",
  },
  {
    id: "task-2",
    description: "生成密码输入框",
    type: "form-item-input-password",
    priority: 1,
    docPaths: ["docs/components/form/input-text.md"],
    status: "pending",
  },
  {
    id: "task-3",
    description: "生成登录提交按钮",
    type: "form-submit",
    priority: 1,
    docPaths: ["docs/components/form/formitem.md"],
    status: "pending",
  },
  {
    id: "task-4",
    description: "组装成完整表单",
    type: "form-assembly",
    priority: 2,
    docPaths: ["docs/components/form/index.md"],
    status: "pending",
  },
];
```

#### 2. 任务执行节点 (Executor Node)

**职责**：执行单个子任务，生成对应的 amis JSON 配置

**工作流程**：

1. 接收当前任务
2. 调用文档检索工具获取相关文档
3. 分析文档，提取配置模式和示例
4. 调用 LLM 生成 JSON 片段（流式输出）
5. 验证生成的 JSON
6. 返回结果

**流式输出事件**：

```typescript
// 任务开始
{
  type: 'task_start',
  taskId: 'task-1',
  message: '开始执行：生成用户名输入框',
  timestamp: '2024-01-07T10:00:00Z'
}

// 文档检索中
{
  type: 'doc_retrieval',
  message: '正在为"生成用户名输入框"检索文档...',
  timestamp: '2024-01-07T10:00:01Z'
}

// 文档已找到
{
  type: 'docs_found',
  docs: ['docs/components/form/input-text.md'],
  count: 1,
  timestamp: '2024-01-07T10:00:02Z'
}

// 正在生成
{
  type: 'generating',
  message: '正在根据文档生成 JSON 配置...',
  timestamp: '2024-01-07T10:00:03Z'
}

// 生成进度（流式）
{
  type: 'generation_progress',
  content: '{\n  "type": "input-text",\n  "name": "username"',
  timestamp: '2024-01-07T10:00:04Z'
}

// 任务完成
{
  type: 'task_complete',
  taskId: 'task-1',
  result: {
    type: "input-text",
    name: "username",
    label: "用户名",
    required: true
  },
  timestamp: '2024-01-07T10:00:05Z'
}
```

#### 3. 文档检索工具 (Doc Retriever Tool)

**职责**：根据任务关键词，从 docs 目录检索相关文档

**实现策略**：

1. 基于关键词匹配（参考 `docs/index.md` 的映射）
2. 读取对应的 Markdown 文件
3. 提取代码示例和配置说明
4. 返回最相关的内容

**关键词映射示例**：

```typescript
const KEYWORD_MAPPING = {
  输入框: "docs/components/form/input-text.md",
  密码: "docs/components/form/input-text.md",
  下拉框: "docs/components/form/select.md",
  日期: "docs/components/form/input-date.md",
  文件上传: "docs/components/form/input-file.md",
  表单: "docs/components/form/index.md",
  表格: "docs/components/table.md",
  弹窗: "docs/components/dialog.md",
  按钮: "docs/components/button.md",
};
```

#### 4. 用户反馈节点 (Feedback Node)

**职责**：收集用户对生成结果的反馈

**支持的反馈类型**：

1. **approve**：批准当前结果，继续下一步
2. **modify**：修改特定任务的输出
3. **add**：添加新组件任务
4. **regenerate**：重新生成所有内容

**反馈界面示例**：

```
已生成以下配置，请查看并反馈：

[显示当前生成的 JSON 预览]

请选择操作：
✅ 满意，继续下一步
✏️ 修改某个组件（请指定组件ID和新要求）
➕ 添加新组件（请描述需要添加的组件）
🔄 重新生成所有内容
```

#### 5. 结果综合节点 (Composer Node)

**职责**：将所有子任务的输出组合成完整的 amis JSON

**综合策略**：

- 根据任务优先级排序
- 智能嵌套结构（如表单项放入 body 中）
- 验证整体结构的完整性
- 生成最终的可直接使用的 JSON

#### 6. 质量验证节点 (Validator Node) - 可选

**职责**：验证最终 JSON 的质量和完整性

**验证项**：

- JSON 语法正确性
- amis schema 合规性
- 是否满足用户需求
- 最佳实践检查

---

## 📊 状态设计 (AgentState)

```typescript
import { Annotation } from "@langchain/langgraph";
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";

// 任务类型定义
type Task = {
  id: string;
  description: string;
  type: string;
  priority: number;
  docPaths: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  retryCount?: number;
  errorMessage?: string;
};

// 执行事件类型
type ExecutionEvent = {
  type:
    | "task_start"
    | "doc_retrieval"
    | "docs_found"
    | "generating"
    | "generation_progress"
    | "task_complete"
    | "error"
    | "feedback";
  timestamp: string;
  taskId?: string;
  message?: string;
  data?: any;
};

// 状态定义
const AgentStateAnnotation = Annotation.Root({
  // CopilotKit 基础状态（包含 messages 和 actions）
  ...CopilotKitStateAnnotation.spec,

  // 用户原始需求
  userRequirement: Annotation<string>,

  // 任务列表
  tasks: Annotation<Task[]>,

  // 当前执行的任务索引
  currentTaskIndex: Annotation<number>,

  // 每个任务的执行结果
  taskResults: Annotation<Record<string, any>[]>,

  // 最终生成的 amis JSON
  finalJson: Annotation<object>,

  // 执行日志（用于流式输出）
  executionLog: Annotation<ExecutionEvent[]>,

  // 用户反馈状态
  feedbackStatus: Annotation<"pending" | "approved" | "modify" | "regenerate">,

  // 需要重新执行的任务索引
  tasksToRetry: Annotation<number[]>,

  // 流式输出累积内容
  streamedContent: Annotation<string>,

  // 错误信息
  error: Annotation<string | null>,
});

export type AgentState = typeof AgentStateAnnotation.State;
```

---

## 🛠️ 工具设计

### 1. 文档检索工具

````typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const retrieveDocumentation = tool(
  async (args) => {
    const { query, taskType } = args;

    // 1. 根据关键词映射到文档路径
    const docPath = mapKeywordToDocPath(query, taskType);

    if (!docPath || !existsSync(docPath)) {
      return {
        success: false,
        error: `未找到相关文档: ${query}`,
        docs: [],
      };
    }

    // 2. 读取文档内容
    const content = readFileSync(docPath, "utf-8");

    // 3. 提取代码示例
    const codeExamples = extractCodeExamples(content);

    // 4. 提取配置说明
    const configDocs = extractConfigDocs(content);

    return {
      success: true,
      docPath,
      content,
      codeExamples,
      configDocs,
      summary: generateSummary(content),
    };
  },
  {
    name: "retrieveDocumentation",
    description: "根据查询和任务类型检索 amis 相关文档",
    schema: z.object({
      query: z.string().describe("查询关键词，如'输入框'、'表单'等"),
      taskType: z.string().describe("任务类型，如 form-item-input-text"),
    }),
  }
);

// 辅助函数
function mapKeywordToDocPath(query: string, taskType: string): string | null {
  // 实现关键词到文档路径的映射
  const mapping: Record<string, string> = {
    输入框: "docs/components/form/input-text.md",
    密码: "docs/components/form/input-text.md",
    下拉框: "docs/components/form/select.md",
    // ... 更多映射
  };

  return mapping[query] || null;
}

function extractCodeExamples(content: string): string[] {
  // 提取 Markdown 中的代码块
  const codeBlockRegex = /```schema[\s\S]*?\n([\s\S]*?)\n```/g;
  const examples: string[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    examples.push(match[1]);
  }

  return examples;
}

function extractConfigDocs(content: string): any {
  // 提取属性表、配置说明等
  // 可以使用正则或专门的 Markdown 解析器
  return {};
}

function generateSummary(content: string): string {
  // 生成文档摘要
  return content.split("\n").slice(0, 10).join("\n");
}
````

### 2. 生成 JSON 片段工具

```typescript
const generateJsonSnippet = tool(
  async (args) => {
    const { taskDescription, documentation, context } = args;

    // 构建提示词
    const prompt = `
你是一个 amis 配置生成专家。请根据以下信息生成符合规范的 amis JSON 配置。

任务描述：${taskDescription}

相关文档：
${documentation}

上下文信息：
- 已完成的任务：${context.previousResults?.length || 0} 个
- 整体需求：${context.globalRequirements}

要求：
1. 生成的 JSON 必须符合 amis 规范
2. 参考文档中的示例代码
3. 包含必要的属性（name, type, label 等）
4. 确保配置的完整性和可用性

请生成 JSON 配置（只返回 JSON，不要有其他内容）：
`;

    // 调用 LLM（使用 streaming）
    const model = new ChatAnthropic({
      temperature: 0.3,
      model: "glm-4.7",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
      anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
    });

    const response = await model.invoke([
      new SystemMessage({ content: "你是 amis 配置生成专家" }),
      new HumanMessage({ content: prompt }),
    ]);

    // 解析生成的 JSON
    try {
      const json = JSON.parse(response.content as string);
      return {
        success: true,
        json,
        confidence: 0.95,
      };
    } catch (error) {
      return {
        success: false,
        error: "生成的 JSON 格式不正确",
        rawContent: response.content,
      };
    }
  },
  {
    name: "generateJsonSnippet",
    description: "根据任务描述和文档生成 amis JSON 片段",
    schema: z.object({
      taskDescription: z.string().describe("任务描述"),
      documentation: z.string().describe("相关文档内容"),
      context: z.object({
        previousResults: z.array(z.any()).describe("之前任务的执行结果"),
        globalRequirements: z.string().describe("用户的全局需求"),
      }),
    }),
  }
);
```

### 3. 用户反馈工具（CopilotKit Actions）

```typescript
// 定义前端可以调用的 actions
const userFeedbackActions = [
  {
    name: "approveResult",
    description: "批准当前生成的结果，继续下一步",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "modifyTask",
    description: "修改特定任务的输出",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "要修改的任务ID，如 task-1",
        },
        newRequirement: {
          type: "string",
          description: "新的要求描述",
        },
      },
      required: ["taskId", "newRequirement"],
    },
  },
  {
    name: "addNewTask",
    description: "添加新的组件任务",
    parameters: {
      type: "object",
      properties: {
        taskDescription: {
          type: "string",
          description: "新任务的描述",
        },
      },
      required: ["taskDescription"],
    },
  },
  {
    name: "regenerateAll",
    description: "重新生成所有内容",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];
```

---

## 🔄 工作流图结构

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

const workflow = new StateGraph(AgentStateAnnotation)
  // 1. 任务规划节点
  .addNode("planner", planner_node)

  // 2. 任务执行节点（支持流式输出）
  .addNode("executor", executor_node)

  // 3. 用户反馈节点
  .addNode("feedback", feedback_node)

  // 4. 结果综合节点
  .addNode("composer", composer_node)

  // 5. 质量验证节点（可选）
  .addNode("validator", validator_node)

  // 边的定义
  .addEdge(START, "planner")
  .addEdge("planner", "executor")

  // 执行器后的条件路由
  .addConditionalEdges("executor", shouldContinueAfterExecutor, {
    executor: "executor", // 继续执行下一个任务
    feedback: "feedback", // 请求用户反馈
    composer: "composer", // 直接综合结果
    __end__: END,
  })

  // 反馈后的路由
  .addConditionalEdges("feedback", handleUserFeedback, {
    executor: "executor", // 修改后重新执行
    composer: "composer", // 用户满意，继续
    planner: "planner", // 添加新任务
  })

  .addEdge("composer", "validator")
  .addEdge("validator", END);

// 编译工作流
const memory = new MemorySaver();
export const graph = workflow.compile({
  checkpointer: memory,
});
```

---

## 🎯 路由逻辑函数

```typescript
// 执行器后的路由判断
function shouldContinueAfterExecutor(state: AgentState) {
  const currentTaskIndex = state.currentTaskIndex;
  const totalTasks = state.tasks.length;
  const feedbackStatus = state.feedbackStatus;

  // 检查是否有需要重试的任务
  if (state.tasksToRetry && state.tasksToRetry.length > 0) {
    return "executor";
  }

  // 检查是否需要用户反馈
  if (shouldRequestFeedback(state)) {
    return "feedback";
  }

  // 所有任务完成
  if (currentTaskIndex >= totalTasks) {
    return "composer";
  }

  // 继续执行下一个任务
  return "executor";
}

// 判断是否需要请求用户反馈
function shouldRequestFeedback(state: AgentState): boolean {
  // 每完成 3 个任务，或所有任务完成时请求反馈
  const completedCount = state.currentTaskIndex;
  const totalTasks = state.tasks.length;

  return (
    (completedCount > 0 && completedCount % 3 === 0) ||
    (completedCount >= totalTasks && state.feedbackStatus === "pending")
  );
}

// 处理用户反馈
function handleUserFeedback(state: AgentState) {
  const feedbackStatus = state.feedbackStatus;
  const tasksToRetry = state.tasksToRetry;

  // 需要重新执行某些任务
  if (feedbackStatus === "modify" || feedbackStatus === "regenerate") {
    return "executor";
  }

  // 用户满意，继续综合
  if (feedbackStatus === "approved") {
    return "composer";
  }

  // 需要添加新任务
  if (feedbackStatus === "add") {
    return "planner";
  }

  // 默认继续
  return "composer";
}
```

---

## 🌊 流式输出实现

### 方式 1: 使用 streamEvents

```typescript
// 在节点中使用 stream_events
async function executor_node(state: AgentState, config: RunnableConfig) {
  const task = state.tasks[state.currentTaskIndex];

  // 流式输出：开始任务
  yield {
    type: 'task_start',
    taskId: task.id,
    message: `开始执行：${task.description}`,
    timestamp: new Date().toISOString()
  };

  // 流式输出：检索文档
  yield {
    type: 'doc_retrieval',
    message: `正在为"${task.description}"检索文档...`,
    timestamp: new Date().toISOString()
  };

  const docs = await retrieveDocumentation({
    query: task.description,
    taskType: task.type
  });

  yield {
    type: 'docs_found',
    docs: docs.success ? [docs.docPath] : [],
    count: docs.success ? 1 : 0,
    timestamp: new Date().toISOString()
  };

  // 流式输出：正在生成
  yield {
    type: 'generating',
    message: '正在根据文档生成 JSON 配置...',
    timestamp: new Date().toISOString()
  };

  // 使用流式 LLM
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    streaming: true
  });

  const stream = await model.stream([
    new SystemMessage({ content: "你是 amis 配置生成专家" }),
    new HumanMessage({ content: buildPrompt(task, docs) })
  ]);

  let fullContent = '';
  for await (const chunk of stream) {
    fullContent += chunk.content;
    yield {
      type: 'generation_progress',
      content: chunk.content,
      partial: fullContent,
      timestamp: new Date().toISOString()
    };
  }

  // 解析 JSON
  const result = JSON.parse(fullContent);

  // 任务完成
  yield {
    type: 'task_complete',
    taskId: task.id,
    result,
    timestamp: new Date().toISOString()
  };

  return {
    taskResults: [...state.taskResults, result],
    currentTaskIndex: state.currentTaskIndex + 1
  };
}
```

### 方式 2: 前端使用 stream

```typescript
// 前端调用示例
const stream = await graph.stream(
  {
    messages: [new HumanMessage("帮我写一个登录表单")],
    userRequirement: "帮我写一个登录表单",
    tasks: [],
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [],
    feedbackStatus: "pending",
  },
  {
    configurable: { thread_id: "session-123" },
    streamMode: "updates", // 或 "values"
  }
);

for await (const event of stream) {
  // 处理每个节点的输出
  console.log("Event:", event);

  // 如果是执行器节点
  if (event.executor) {
    const executorOutput = event.executor;

    // 更新进度 UI
    updateProgressUI(executorOutput);

    // 显示部分生成的内容
    if (executorOutput.partial) {
      displayPartialJson(executorOutput.partial);
    }

    // 任务完成时显示结果
    if (executorOutput.type === "task_complete") {
      displayTaskResult(executorOutput.result);
    }
  }

  // 如果是反馈节点
  if (event.feedback) {
    showFeedbackDialog(event.feedback);
  }
}
```

---

## 💬 用户反馈实现

### 反馈节点实现

```typescript
async function feedback_node(state: AgentState, config: RunnableConfig) {
  const taskResults = state.taskResults;

  // 生成预览
  const preview = generatePreview(taskResults);

  // 添加反馈请求事件到日志
  const feedbackEvent: ExecutionEvent = {
    type: "feedback",
    timestamp: new Date().toISOString(),
    message: "请审核以下生成结果",
    data: {
      preview,
      options: [
        "✅ 满意，继续下一步",
        "✏️ 修改某个组件",
        "➕ 添加新组件",
        "🔄 重新生成所有内容",
      ],
    },
  };

  // 返回，等待用户通过 messages 提供反馈
  return {
    executionLog: [...state.executionLog, feedbackEvent],
  };
}

// 解析用户反馈
function parseUserFeedback(message: string): {
  action: "approve" | "modify" | "add" | "regenerate";
  details?: any;
} {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("满意") || lowerMessage.includes("继续")) {
    return { action: "approve" };
  }

  if (lowerMessage.includes("修改")) {
    // 解析任务ID和新要求
    const taskIdMatch = message.match(/task-(\d+)/);
    const taskId = taskIdMatch ? `task-${taskIdMatch[1]}` : null;
    const newRequirement = message.replace(/修改.*?task-\d+[\s,，]*/, "");

    return {
      action: "modify",
      details: { taskId, newRequirement },
    };
  }

  if (lowerMessage.includes("添加")) {
    const newTaskDesc = message.replace(/添加[\s,，]*/, "");
    return {
      action: "add",
      details: { taskDescription: newTaskDesc },
    };
  }

  if (lowerMessage.includes("重新生成")) {
    return { action: "regenerate" };
  }

  // 默认为批准
  return { action: "approve" };
}
```

### 前端反馈界面

```typescript
// 前端组件示例（React）
function FeedbackDialog({ preview, onFeedback }) {
  const [selectedOption, setSelectedOption] = useState("");
  const [details, setDetails] = useState("");

  return (
    <div className="feedback-dialog">
      <h3>请审核生成结果</h3>

      {/* 显示预览 */}
      <div className="preview">
        <pre>{JSON.stringify(preview, null, 2)}</pre>
      </div>

      {/* 选项 */}
      <div className="options">
        <button onClick={() => setSelectedOption("approve")}>
          ✅ 满意，继续下一步
        </button>
        <button onClick={() => setSelectedOption("modify")}>
          ✏️ 修改某个组件
        </button>
        <button onClick={() => setSelectedOption("add")}>➕ 添加新组件</button>
        <button onClick={() => setSelectedOption("regenerate")}>
          🔄 重新生成所有内容
        </button>
      </div>

      {/* 详情输入 */}
      {selectedOption && (
        <div className="details">
          <textarea
            placeholder={getPlaceholder(selectedOption)}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <button onClick={() => onFeedback(selectedOption, details)}>
            提交
          </button>
        </div>
      )}
    </div>
  );
}

function getPlaceholder(option: string): string {
  const placeholders = {
    modify: "请输入要修改的任务ID（如 task-1）和新的要求",
    add: "请描述需要添加的新组件",
    regenerate: "请说明为什么需要重新生成（可选）",
    approve: "",
  };
  return placeholders[option] || "";
}
```

---

## 📝 实现步骤

### 第一阶段：基础框架（核心功能）

1. **定义状态和类型**

   - 创建 `AgentStateAnnotation`
   - 定义 `Task` 和 `ExecutionEvent` 类型

2. **实现文档检索工具**

   - 关键词映射功能
   - 文档内容读取和解析
   - 代码示例提取

3. **实现任务规划节点**

   - 分析用户需求
   - 拆分任务
   - 生成任务列表

4. **实现任务执行节点**

   - 调用文档检索
   - 生成 JSON 配置
   - 基础流式输出

5. **实现结果综合节点**
   - 组合所有任务结果
   - 生成最终 JSON

### 第二阶段：流式输出

6. **增强执行节点**

   - 添加流式事件输出
   - 实现 `streamEvents` 支持

7. **前端流式显示**
   - 实时更新 UI
   - 显示生成进度
   - 显示部分内容

### 第三阶段：用户反馈

8. **实现反馈节点**

   - 生成预览
   - 处理用户反馈
   - 动态路由调整

9. **前端反馈界面**

   - 反馈对话框
   - 操作选项
   - 详情输入

10. **反馈处理逻辑**
    - 修改任务
    - 添加新任务
    - 重新生成

### 第四阶段：优化和增强

11. **质量验证**

    - JSON 验证
    - amis schema 检查
    - 最佳实践验证

12. **错误处理**

    - 任务失败重试
    - 错误日志记录
    - 用户友好的错误提示

13. **性能优化**

    - 文档缓存
    - 并行任务执行（可选）
    - 增量生成

14. **测试和调试**
    - 单元测试
    - 集成测试
    - 用户测试

---

## 🎨 使用示例

### 基本使用

```typescript
// 用户输入
const userInput = "帮我写一个登录表单";

// 启动工作流（流式）
const stream = await graph.stream(
  {
    messages: [new HumanMessage(userInput)],
    userRequirement: userInput,
    tasks: [],
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [],
    feedbackStatus: "pending",
  },
  {
    configurable: { thread_id: generateSessionId() },
  }
);

// 处理流式输出
for await (const event of stream) {
  handleEvent(event);
}
```

### 事件处理

```typescript
function handleEvent(event: any) {
  // 任务开始
  if (event.executor?.type === "task_start") {
    console.log(`✨ 开始任务: ${event.executor.message}`);
    updateProgressBar(0);
  }

  // 文档检索
  if (event.executor?.type === "doc_retrieval") {
    console.log(`🔍 ${event.executor.message}`);
  }

  // 生成中
  if (event.executor?.type === "generation_progress") {
    console.log(`⚙️ 生成中: ${event.executor.content}`);
    updatePartialDisplay(event.executor.partial);
  }

  // 任务完成
  if (event.executor?.type === "task_complete") {
    console.log(`✅ 完成: ${event.executor.taskId}`);
    displayResult(event.executor.result);
  }

  // 请求反馈
  if (event.feedback) {
    showFeedbackDialog(event.feedback);
  }
}
```

### 用户反馈示例

```typescript
// 场景 1：用户满意
userAction: "approve"
// → 继续执行或综合结果

// 场景 2：修改某个组件
userAction: {
  type: "modify",
  taskId: "task-1",
  newRequirement: "添加验证规则，用户名必须包含字母和数字"
}
// → 重新执行 task-1

// 场景 3：添加新组件
userAction: {
  type: "add",
  taskDescription: "添加一个记住密码的复选框"
}
// → 回到 planner 添加新任务

// 场景 4：重新生成
userAction: "regenerate"
// → 重新执行所有任务
```

---

## 🔧 技术栈

- **框架**: LangGraph
- **LLM**: Anthropic Claude (通过 ChatAnthropic)
- **前端集成**: CopilotKit
- **文档解析**: 自定义 Markdown 解析器
- **JSON 验证**: amis schema validator
- **状态管理**: LangGraph State with checkpointer

---

## 📚 参考资料

- LangGraph 文档: https://langchain-ai.github.io/langgraph/
- CopilotKit 文档: https://docs.copilotkit.ai/
- amis 文档: `docs/index.md` 及相关组件文档
- 现有实现: `src/agent.ts`

---

## 🎯 预期成果

1. **高效的任务规划**: 自动将复杂需求拆分为可执行的子任务
2. **高质量的代码生成**: 基于官方文档生成符合规范的 amis JSON
3. **良好的用户体验**: 流式输出提供实时反馈，无需等待
4. **灵活的控制**: 用户可以随时干预、修改、优化生成结果
5. **可扩展性**: 易于添加新的组件类型和功能

---

## 🚀 下一步行动

请**toggle to Act mode**，我将开始实现完整的代码！

实现顺序：

1. 创建新的 agent 文件（如 `src/amis-agent.ts`）
2. 实现状态定义和工具
3. 实现各个节点
4. 构建工作流图
5. 测试和优化
