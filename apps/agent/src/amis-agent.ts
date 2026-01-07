/**
 * LangGraph 复杂任务规划与执行系统
 * 用于根据用户需求生成高质量的 amis JSON 配置
 *
 * 功能特性：
 * - 任务自动规划与拆分
 * - 文档驱动的代码生成
 * - 实时流式输出
 * - 用户反馈机制
 * - 智能路由和状态管理
 */

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { MemorySaver, START, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  convertActionsToDynamicStructuredTools,
  CopilotKitStateAnnotation,
} from "@copilotkit/sdk-js/langgraph";
import { Annotation } from "@langchain/langgraph";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getIndexer, initializeIndexer, type DocHit } from "./docs-index.js";
import { debug } from "util";

// ============================================================
// 类型定义
// ============================================================

/**
 * 任务类型定义
 */
export type Task = {
  id: string;
  description: string;
  type: string;
  priority: number;
  docPaths: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  retryCount?: number;
  errorMessage?: string;
  // 子任务列表（用于可复用 Planner 的二次拆解）
  subtasks?: Task[];
  // 文档命中信息（供上下文注入与证据链记录）
  docHints?: Array<{
    path: string;
    anchors?: string[];
    score?: number;
    summary?: string;
  }>;
};

/**
 * 执行事件类型（用于流式输出）
 */
export type ExecutionEvent = {
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

// ============================================================
// 状态定义
// ============================================================

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

  // 为当前任务准备的上下文文档片段（由 docs/context 节点产出）
  contextDocuments: Annotation<
    Array<{
      path: string;
      summary?: string;
      codeExamples?: string[];
      anchors?: string[];
      content?: string;
      score?: number;
    }>
  >,

  // 需要回到规划节点重新规划
  needsReplan: Annotation<boolean>,
});

export type AmisAgentState = typeof AgentStateAnnotation.State;

// ============================================================
// 文档检索工具
// ============================================================

/**
 * 文档检索工具（使用全量索引）
 */
const retrieveDocumentation = tool(
  async (args) => {
    const { query, taskType } = args;

    try {
      const indexer = getIndexer(process.env.DOCS_ROOT);

      // 调用索引搜索
      const hits = indexer.search(query, 10);

      if (hits.length === 0) {
        return {
          success: false,
          error: `未找到相关文档: ${query}`,
          documents: [],
          docPaths: [],
        };
      }

      // 转换为返回格式
      const documents = hits.map((hit) => ({
        path: hit.path,
        title: hit.title,
        summary: hit.summary,
        anchors: hit.anchors,
        codeExamples: hit.codeExamples,
        score: hit.score,
      }));

      const docPaths = documents.map((d) => d.path);

      return {
        success: true,
        docPaths,
        documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `文档检索失败: ${(error as Error).message}`,
        documents: [],
        docPaths: [],
      };
    }
  },
  {
    name: "retrieveDocumentation",
    description: "根据查询和任务类型检索 amis 相关文档（使用全量索引）",
    schema: z.object({
      query: z.string().describe("查询关键词或描述"),
      taskType: z.string().describe("任务类型（可选）"),
    }),
  }
);

// ============================================================
// 工具集合
// ============================================================

const tools = [retrieveDocumentation];

/**
 * 初始化 Agent（包括索引器构建）
 */
export async function initializeAgent(docsRoot?: string): Promise<void> {
  console.log("🚀 [Agent] 初始化开始...");
  try {
    await initializeIndexer(docsRoot);
    console.log("✅ [Agent] 初始化完成");
  } catch (error) {
    console.error("❌ [Agent] 初始化失败:", (error as Error).message);
    throw error;
  }
}

// ============================================================
// 节点实现
// ============================================================

/**
 * 1. 任务规划节点 (Planner Node)
 * 职责：分析用户需求，生成结构化的子任务列表
 */
async function planner_node(state: AmisAgentState, config: RunnableConfig) {
  const userRequirement =
    state.userRequirement ||
    (state.messages[state.messages.length - 1] as HumanMessage).content;

  console.log(`\n📋 [Planner] 分析用户需求: ${userRequirement}`);

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 构建提示词
  const prompt = `你是一个 amis 配置任务规划专家。请分析用户需求，将其拆分为可执行的子任务。

用户需求：${userRequirement}

请生成任务列表，每个任务包含：
- id: 任务唯一标识（如 task-1, task-2）
- description: 任务描述（清晰说明要实现什么）
- type: 任务类型（如 form-item-input-text, form-item-select, form-assembly, crud-table 等）
- priority: 优先级（1=高，2=中，3=低）
- docPaths: 留空数组（将在后续步骤由文档检索工具自动补全）
- status: 状态（固定为 "pending"）

要求：
1. 只返回 JSON 数组，不要有其他内容
2. 按照执行顺序排列任务
3. 最后一个任务应该是"组装"类型（如 form-assembly, page-assembly）以合成所有组件
4. 任务描述要足够具体，便于后续工具进行文档检索
5. 不要尝试预测或列举具体的文档路径，这会在后续步骤自动处理

请生成任务列表（JSON 数组格式）：`;

  // 调用 LLM
  const response = await model.invoke([
    new SystemMessage({ content: "你是 amis 配置任务规划专家" }),
    new HumanMessage({ content: prompt }),
  ]);

  // 解析响应
  let tasks: Task[] = [];
  try {
    const content = response.content as string;
    // 提取 ```json``` 代码块中的 JSON
    const jsonCodeBlockMatch = content.match(
      /```json[\s\S]*?\n([\s\S]*?)\n```/
    );
    if (jsonCodeBlockMatch) {
      tasks = JSON.parse(jsonCodeBlockMatch[1]);
    } else {
      // 如果没有代码块，尝试直接解析
      tasks = JSON.parse(content);
    }

    // 确保所有任务都有必需的字段
    tasks = tasks.map((task: any) => ({
      ...task,
      status: "pending",
      result: undefined,
      retryCount: 0,
    }));
  } catch (error) {
    console.error("任务列表解析失败:", error);
    // 返回默认任务列表
    const err = error as Error;
    tasks = [
      {
        id: "task-1",
        description: "分析需求并生成配置",
        type: "general",
        priority: 1,
        docPaths: ["docs/index.md"],
        status: "pending" as const,
      },
    ];
  }

  console.log(`✅ [Planner] 生成了 ${tasks.length} 个任务`);
  tasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.description} (${task.type})`);
  });

  // 添加执行日志
  const event: ExecutionEvent = {
    type: "task_start",
    timestamp: new Date().toISOString(),
    message: `任务规划完成，共生成 ${tasks.length} 个子任务`,
    data: { tasks },
  };

  return {
    tasks,
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [...(state.executionLog || []), event],
    userRequirement: userRequirement as string,
    contextDocuments: [],
    needsReplan: false,
  };
}

/**
 * 1.5 文档关联节点 (Docs Associate Node)
 * 职责：判断任务是否与 amis 构建相关；若相关则检索并关联文档地址到任务
 */
async function docs_associate_node(
  state: AmisAgentState,
  config: RunnableConfig
) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];

  if (currentIndex >= tasks.length) {
    return {};
  }

  const task = tasks[currentIndex];

  const related = isAmisRelated(task);
  const startEvent: ExecutionEvent = {
    type: "doc_retrieval",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: related
      ? `开始为任务检索文档：${task.description}`
      : `任务与 amis 无明显关联，跳过文档检索`,
  };

  let updates: Partial<Task> = {};

  if (related) {
    try {
      const res: any = await retrieveDocumentation.invoke({
        query: task.description,
        taskType: task.type || "",
      });

      if (
        res &&
        res.success &&
        Array.isArray(res.documents) &&
        res.documents.length
      ) {
        const docHints = res.documents.map((d: any) => ({
          path: d.path,
          anchors: [],
          score: d.score,
          summary: d.summary,
        }));
        updates = {
          docPaths: res.docPaths || docHints.map((h: any) => h.path),
          docHints,
        };

        const foundEvent: ExecutionEvent = {
          type: "docs_found",
          timestamp: new Date().toISOString(),
          taskId: task.id,
          message: `找到 ${docHints.length} 篇相关文档`,
          data: { docPaths: updates.docPaths },
        };

        tasks[currentIndex] = { ...task, ...updates } as Task;
        return {
          tasks,
          executionLog: [...(state.executionLog || []), startEvent, foundEvent],
        };
      }
    } catch (e) {
      const errEvent: ExecutionEvent = {
        type: "error",
        timestamp: new Date().toISOString(),
        taskId: task.id,
        message: `文档检索异常：${(e as Error).message}`,
      };
      return {
        executionLog: [...(state.executionLog || []), startEvent, errEvent],
      };
    }
  }

  // 无关联或未命中文档
  tasks[currentIndex] = { ...task, ...updates } as Task;
  return { tasks, executionLog: [...(state.executionLog || []), startEvent] };
}

/**
 * 2.5 上下文注入节点 (Context Node)
 * 职责：将与任务相关的文档内容（摘要/示例）准备好注入到执行提示词
 */
async function context_node(state: AmisAgentState, config: RunnableConfig) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];
  if (currentIndex >= tasks.length) {
    return { contextDocuments: [] };
  }

  const task = tasks[currentIndex];
  const hints = task.docHints || [];
  const docs: Array<{
    path: string;
    summary?: string;
    codeExamples?: string[];
    anchors?: string[];
    content?: string;
    score?: number;
  }> = [];

  for (const h of hints.slice(0, 5)) {
    try {
      if (existsSync(h.path)) {
        const content = readFileSync(h.path, "utf-8");
        docs.push({
          path: h.path,
          summary: h.summary || extractSummaryFromContent(content),
          codeExamples: extractCodeExamplesFromContent(content),
          anchors: h.anchors,
          content,
          score: h.score,
        });
      }
    } catch {
      // 忽略单个文件的读取错误
    }
  }

  const event: ExecutionEvent = {
    type: "generating",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: docs.length
      ? `已准备 ${docs.length} 个上下文文档片段`
      : "未找到可用上下文文档，继续执行",
  };

  return {
    contextDocuments: docs,
    executionLog: [...(state.executionLog || []), event],
  };
}

// 简单判断任务是否与 amis 构建相关
function isAmisRelated(task: Task): boolean {
  const text = `${task.type || ""} ${task.description || ""}`;
  const keys = [
    "amis",
    "form",
    "input",
    "select",
    "table",
    "crud",
    "page",
    "dialog",
    "drawer",
    "tabs",
    "wizard",
    "card",
    "button",
    "chart",
  ];
  return keys.some((k) => text.toLowerCase().includes(k));
}

/**
 * 提取 Markdown 中的代码示例（上下文注入时使用）
 */
function extractCodeExamplesFromContent(content: string): string[] {
  const examples: string[] = [];

  // 提取 ```schema``` 或 ```json``` 块
  const codeRegex = /```(?:schema|json)\n([\s\S]*?)\n```/g;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (code) {
      examples.push(code);
    }
  }

  return examples;
}

/**
 * 生成文档摘要（上下文注入时使用）
 */
function extractSummaryFromContent(content: string): string {
  const lines = content.split("\n");
  const summary: string[] = [];

  for (const line of lines) {
    // 跳过代码块
    if (line.startsWith("```")) continue;
    // 收集标题和前 10 行文本
    if (line.startsWith("#") || line.trim() !== "") {
      summary.push(line);
    }
    if (summary.length >= 10) break;
  }

  return summary.join("\n").trim().slice(0, 200);
}
/**
 * 2. 任务执行节点 (Executor Node)
 * 职责：执行单个子任务，生成对应的 amis JSON 配置
 */
// TODO: 提示词需要修改
async function executor_node(state: AmisAgentState, config: RunnableConfig) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];

  // 检查是否还有任务需要执行
  if (currentIndex >= tasks.length) {
    console.log("\n✅ [Executor] 所有任务已完成");
    return { currentTaskIndex: currentIndex };
  }

  const task = tasks[currentIndex];

  console.log(
    `\n⚙️ [Executor] 执行任务 ${currentIndex + 1}/${tasks.length}: ${
      task.description
    }`
  );

  // 更新任务状态
  tasks[currentIndex].status = "in_progress";

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 绑定工具
  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions ?? []),
    ...tools,
  ]);

  // 构建提示词
  const prompt = `你是 amis 配置生成专家。请根据任务描述生成符合规范的 amis JSON 配置。

任务描述：${task.description}
任务类型：${task.type}

用户整体需求：${state.userRequirement}

${
  state.taskResults && state.taskResults.length > 0
    ? `已生成的组件：
${JSON.stringify(state.taskResults, null, 2)}

请确保新组件与已有组件能够正确组合。`
    : ""
}

${
  state.contextDocuments && state.contextDocuments.length > 0
    ? `以下是与本任务相关的文档摘录（供参考）：\n${state.contextDocuments
        .slice(0, 3)
        .map(
          (d, i) =>
            `【文档${i + 1}】${d.path}\n摘要：${d.summary || ""}\n示例：\n${(
              d.codeExamples || []
            )
              .slice(0, 1)
              .join("\n")}`
        )
        .join("\n\n")}\n请遵循文档规范进行配置。`
    : ""
}

要求：
1. 只返回 JSON 对象，不要有其他内容
2. 必须包含 type、name 等必需属性
3. 参考 amis 官方文档的规范
4. 确保配置的完整性和可用性
5. 如果是表单项，需要包含 label 属性

请生成 amis JSON 配置：`;

  // 调用 LLM
  const response = await modelWithTools.invoke(
    [new SystemMessage({ content: prompt }), ...state.messages],
    config
  );

  let result: any = null;
  let errorMessage: string | undefined;

  // 检查是否有工具调用
  if (response.tool_calls && response.tool_calls.length > 0) {
    // 如果调用了文档检索工具，返回工具调用结果
    console.log(`📚 [Executor] 调用工具: ${response.tool_calls[0].name}`);
    return { messages: response };
  }

  // 解析响应内容
  try {
    const content = response.content;
    console.log(typeof content);
    let result: Record<string, unknown> | null = null;
    if (typeof content === "string") {
      // 提取 ```json``` 代码块中的 JSON 对象
      const jsonCodeBlockMatch = content.match(
        /```json[\s\S]*?\n([\s\S]*?)\n```/
      );
      if (jsonCodeBlockMatch) {
        result = JSON.parse(jsonCodeBlockMatch[1]);
      } else {
        // 如果没有代码块，尝试直接解析
        result = JSON.parse(content);
      }
      console.log(`✅ [Executor] 成功生成配置`);
      console.log(JSON.stringify(result, null, 2));
    } else if (typeof content === "object") {
      console.log(`✅ [Executor] 获取配置成功`, content);
      result = content;
    }

    // 更新任务状态
    tasks[currentIndex].status = "completed";
    tasks[currentIndex].result = result;
  } catch (error) {
    const err = error as Error;
    errorMessage = `JSON 解析失败: ${err.message}`;
    console.error(`❌ [Executor] ${errorMessage} ${JSON.stringify(response)}`);

    tasks[currentIndex].status = "failed";
    tasks[currentIndex].errorMessage = errorMessage;
    tasks[currentIndex].retryCount = (tasks[currentIndex].retryCount || 0) + 1;
  }

  // 添加执行日志
  const event: ExecutionEvent = {
    type: errorMessage ? "error" : "task_complete",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: errorMessage || `任务 ${task.id} 完成`,
    data: result,
  };

  return {
    messages: response,
    taskResults: result
      ? [...(state.taskResults || []), result]
      : state.taskResults || [],
    currentTaskIndex: currentIndex + 1,
    tasks,
    executionLog: [...(state.executionLog || []), event],
    // 本轮用过的上下文清空，交给下个任务的 context 节点重新准备
    contextDocuments: [],
  };
}

/**
 * 3. 结果综合节点 (Composer Node)
 * 职责：将所有子任务的输出组合成完整的 amis JSON
 */
async function composer_node(state: AmisAgentState, config: RunnableConfig) {
  console.log("\n🎼 [Composer] 开始综合结果...");

  const taskResults = state.taskResults || [];
  const tasks = state.tasks || [];
  const userRequirement = state.userRequirement;

  console.log(`📊 [Composer] 已有 ${taskResults.length} 个组件需要综合`);

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 如果有任务结果，综合它们
  if (taskResults.length > 0) {
    // 构建提示词
    const prompt = `你是 amis 配置综合专家。请将以下组件综合成一个完整的 amis JSON 配置。

用户需求：${userRequirement}

已生成的组件：
${JSON.stringify(taskResults, null, 2)}

综合要求：
1. 将所有组件组合成完整的页面配置
2. 如果是表单组件，放入 form 的 body 中
3. 如果是页面，包含 type: "page"
4. 确保结构完整，可直接在 amis 中使用
5. 添加必要的 API 配置（如需要）
6. 只返回 JSON 对象，不要有其他内容

请生成完整的 amis JSON 配置：`;

    const response = await model.invoke([
      new SystemMessage({ content: "你是 amis 配置综合专家" }),
      new HumanMessage({ content: prompt }),
    ]);

    try {
      const content = response.content as string;
      console.log(typeof content);
      // 提取 ```json``` 代码块中的 JSON 对象
      const jsonCodeBlockMatch = content.match(
        /```json[\s\S]*?\n([\s\S]*?)\n```/
      );
      let finalJson;
      if (jsonCodeBlockMatch) {
        finalJson = JSON.parse(jsonCodeBlockMatch[1]);
      } else {
        // 如果没有代码块，尝试直接解析
        finalJson = JSON.parse(content);
      }
      console.log("✅ [Composer] 综合完成");
      console.log(JSON.stringify(finalJson, null, 2));

      // 添加执行日志
      const event: ExecutionEvent = {
        type: "task_complete",
        timestamp: new Date().toISOString(),
        message: "结果综合完成",
        data: finalJson,
      };

      return {
        finalJson,
        executionLog: [...(state.executionLog || []), event],
      };
    } catch (error) {
      const err = error as Error;
      console.error("❌ [Composer] 综合失败:", error);

      // 如果综合失败，至少返回已有的组件数组
      const fallbackJson = {
        type: "page",
        body: taskResults,
      };

      return {
        finalJson: fallbackJson,
        error: `综合失败: ${err.message}`,
      };
    }
  } else {
    console.log("⚠️ [Composer] 没有组件需要综合");
    return {
      finalJson: {
        type: "page",
        body: [],
      },
    };
  }
}

// ============================================================
// 路由逻辑
// ============================================================

/**
 * 判断是否需要继续执行
 */
function shouldContinue(state: AmisAgentState): string {
  const currentIndex = state.currentTaskIndex || 0;
  const totalTasks = state.tasks?.length || 0;

  // 若需要回到规划阶段（例如需求变化或失败后重规划）
  if (state.needsReplan) return "planner";

  // 如果上一个已执行任务失败，则回到规划节点复盘/重拆
  const lastIndex = currentIndex - 1;
  if (
    lastIndex >= 0 &&
    state.tasks &&
    state.tasks[lastIndex] &&
    state.tasks[lastIndex].status === "failed"
  ) {
    return "planner";
  }

  // 检查最后一条消息是否有工具调用
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage?.tool_calls?.length) {
    const toolCall = lastMessage.tool_calls[0];
    // 验证工具调用对象有必需的 id 和 name 字段
    if (toolCall?.id && toolCall?.name) {
      // 检查是否是 CopilotKit action（不需要路由到 tool_node）
      const actions = state.copilotkit?.actions;
      const toolCallName = toolCall.name;

      if (!actions || actions.every((action) => action.name !== toolCallName)) {
        return "tool_node";
      }
    }
  }

  // 检查是否有需要重试的任务
  if (state.tasksToRetry && state.tasksToRetry.length > 0) {
    return "executor";
  }

  // 所有任务完成，进入综合阶段
  if (currentIndex >= totalTasks) {
    return "composer";
  }

  // 下一个步骤：为当前任务做文档关联与上下文准备
  return "docs_associate";
}

/**
 * 判断是否需要用户反馈
 */
function shouldRequestFeedback(state: AmisAgentState): boolean {
  const completedCount = state.currentTaskIndex || 0;
  const totalTasks = state.tasks?.length || 0;
  const feedbackStatus = state.feedbackStatus || "pending";

  // 每完成 3 个任务，或所有任务完成时请求反馈
  return (
    (completedCount > 0 && completedCount % 3 === 0) ||
    (completedCount >= totalTasks && feedbackStatus === "pending")
  );
}

// ============================================================
// 工作流图定义
// ============================================================

const workflow = new StateGraph(AgentStateAnnotation)
  // 添加节点
  .addNode("planner", planner_node)
  // 文档关联节点：为当前任务检索与绑定文档地址
  .addNode("docs_associate", docs_associate_node)
  // 上下文注入节点：根据已关联文档收集摘要/示例，准备给执行器
  .addNode("context", context_node)
  .addNode("executor", executor_node)
  .addNode("tool_node", new ToolNode(tools))
  .addNode("composer", composer_node)

  // 添加边
  .addEdge(START, "planner")
  .addEdge("planner", "docs_associate")
  .addEdge("docs_associate", "context")
  .addEdge("context", "executor")
  .addEdge("tool_node", "executor")

  // 条件边：判断是否继续执行
  .addConditionalEdges("executor", shouldContinue, {
    planner: "planner",
    docs_associate: "docs_associate",
    executor: "executor",
    tool_node: "tool_node",
    composer: "composer",
  })

  .addEdge("composer", END);

// 编译工作流
const memory = new MemorySaver();
export const graph = workflow.compile({
  checkpointer: memory,
});

// ============================================================
// 导出
// ============================================================

export { AgentStateAnnotation };
