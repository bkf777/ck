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
});

export type AmisAgentState = typeof AgentStateAnnotation.State;

// ============================================================
// 文档检索工具
// ============================================================

/**
 * 关键词到文档路径的映射
 */
const KEYWORD_MAPPING: Record<string, string[]> = {
  输入框: ["docs/components/form/input-text.md"],
  密码: ["docs/components/form/input-text.md"],
  文本框: ["docs/components/form/input-text.md"],
  下拉框: ["docs/components/form/select.md"],
  选择器: ["docs/components/form/select.md"],
  日期: [
    "docs/components/form/input-date.md",
    "docs/components/form/input-datetime.md",
  ],
  时间: [
    "docs/components/form/input-time.md",
    "docs/components/form/input-datetime.md",
  ],
  文件上传: ["docs/components/form/input-file.md"],
  富文本: ["docs/components/form/input-rich-text.md"],
  代码编辑: ["docs/components/form/editor.md"],
  复选框: ["docs/components/form/checkbox.md"],
  单选框: ["docs/components/form/radios.md"],
  开关: ["docs/components/form/switch.md"],
  表单: ["docs/components/form/index.md", "docs/components/form/formitem.md"],
  表格: ["docs/components/table.md", "docs/components/crud.md"],
  列表: ["docs/components/list.md", "docs/components/crud.md"],
  弹窗: ["docs/components/dialog.md"],
  抽屉: ["docs/components/drawer.md"],
  按钮: ["docs/components/button.md"],
  卡片: ["docs/components/card.md", "docs/components/cards.md"],
  标签页: ["docs/components/tabs.md"],
  向导: ["docs/components/wizard.md"],
  图表: ["docs/components/chart.md"],
  导航: ["docs/components/nav.md"],
};

/**
 * 文档检索工具
 */
const retrieveDocumentation = tool(
  async (args) => {
    const { query, taskType } = args;

    try {
      // 1. 根据关键词映射到文档路径
      const docPaths = mapKeywordToDocPaths(query, taskType);

      if (docPaths.length === 0) {
        return {
          success: false,
          error: `未找到相关文档: ${query}`,
          docs: [],
        };
      }

      // 2. 读取所有相关文档内容
      const documents = [];
      for (const docPath of docPaths) {
        if (existsSync(docPath)) {
          const content = readFileSync(docPath, "utf-8");
          const codeExamples = extractCodeExamples(content);

          documents.push({
            path: docPath,
            content,
            codeExamples,
            summary: generateSummary(content),
          });
        }
      }

      if (documents.length === 0) {
        return {
          success: false,
          error: `文档文件不存在: ${docPaths.join(", ")}`,
          docs: [],
        };
      }

      // 3. 返回找到的文档
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
        docs: [],
      };
    }
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

/**
 * 辅助函数：将关键词映射到文档路径
 */
function mapKeywordToDocPaths(query: string, taskType: string): string[] {
  // 直接匹配
  if (KEYWORD_MAPPING[query]) {
    return KEYWORD_MAPPING[query];
  }

  // 模糊匹配
  for (const [keyword, paths] of Object.entries(KEYWORD_MAPPING)) {
    if (query.includes(keyword) || keyword.includes(query)) {
      return paths;
    }
  }

  // 根据 taskType 匹配
  if (taskType.includes("input-text")) {
    return ["docs/components/form/input-text.md"];
  }
  if (taskType.includes("select")) {
    return ["docs/components/form/select.md"];
  }
  if (taskType.includes("form")) {
    return [
      "docs/components/form/index.md",
      "docs/components/form/formitem.md",
    ];
  }

  return [];
}

/**
 * 辅助函数：提取 Markdown 中的代码示例
 */
function extractCodeExamples(content: string): string[] {
  const examples: string[] = [];

  // 提取 ```schema 代码块
  const schemaRegex = /```schema[\s\S]*?\n([\s\S]*?)\n```/g;
  let match;
  while ((match = schemaRegex.exec(content)) !== null) {
    examples.push(match[1].trim());
  }

  // 提取普通 JSON 代码块
  const jsonRegex = /```json[\s\S]*?\n([\s\S]*?)\n```/g;
  while ((match = jsonRegex.exec(content)) !== null) {
    try {
      // 验证是否是有效 JSON
      JSON.parse(match[1].trim());
      examples.push(match[1].trim());
    } catch {
      // 忽略无效 JSON
    }
  }

  return examples;
}

/**
 * 辅助函数：生成文档摘要
 */
function generateSummary(content: string): string {
  const lines = content.split("\n");

  // 提取标题部分
  const summary: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (
      !inCodeBlock &&
      (line.startsWith("#") || line.startsWith("##") || line.trim() === "")
    ) {
      summary.push(line);
      if (summary.length > 20) break;
    }
  }

  return summary.join("\n").trim();
}

// ============================================================
// 工具集合
// ============================================================

const tools = [retrieveDocumentation];

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
- description: 任务描述
- type: 任务类型（如 form-item-input-text, form-item-select, form-assembly 等）
- priority: 优先级（1=高，2=中，3=低）
- docPaths: 相关文档路径数组（从以下路径选择）
- status: 状态（固定为 "pending"）

可用文档路径：
- docs/components/form/input-text.md - 文本输入框
- docs/components/form/select.md - 下拉选择框
- docs/components/form/input-date.md - 日期选择
- docs/components/form/input-file.md - 文件上传
- docs/components/form/checkbox.md - 复选框
- docs/components/form/radios.md - 单选框
- docs/components/form/switch.md - 开关按钮
- docs/components/button.md - 按钮
- docs/components/form/index.md - 表单容器
- docs/components/table.md - 表格
- docs/components/dialog.md - 弹窗
- docs/components/card.md - 卡片

要求：
1. 只返回 JSON 数组，不要有其他内容
2. 按照执行顺序排列任务
3. 最后一个任务应该是"组装"类型（如 form-assembly）
4. 确保文档路径存在且相关

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
  };
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
      result = content as Record<string, unknown>;
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

  // 检查最后一条消息是否有工具调用
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage?.tool_calls?.length) {
    // 检查是否是 CopilotKit action（不需要路由到 tool_node）
    const actions = state.copilotkit?.actions;
    const toolCallName = lastMessage.tool_calls![0].name;

    if (!actions || actions.every((action) => action.name !== toolCallName)) {
      return "tool_node";
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

  // 继续执行下一个任务
  return "executor";
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
  .addNode("executor", executor_node)
  .addNode("tool_node", new ToolNode(tools))
  .addNode("composer", composer_node)

  // 添加边
  .addEdge(START, "planner")
  .addEdge("planner", "executor")
  .addEdge("tool_node", "executor")

  // 条件边：判断是否继续执行
  .addConditionalEdges("executor", shouldContinue, {
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
