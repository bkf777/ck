import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { createChatModel } from "../../utils/model-factory.js";
import { AmisAgentState } from "../state.js";
import { Task, ExecutionEvent } from "../types.js";

/**
 * --- 1. 将业务规则与组件约束完全封装进 Zod Schema ---
 * 模型在调用工具时会自动读取这些 describe 信息，从而实现精准控制。
 */
const PLAN_TASKS_SCHEMA = z.object({
  tasks: z.array(z.object({
    id: z.string().describe("任务唯一标识，例如 task-1, task-2"),
    title: z.string().describe("任务标题，例如 '用户管理表格'"),
    description: z.string().describe(
      "极其详细的任务实施描述。要求：\n" +
      "1. **粗粒度聚合**：描述一个完整的组件块（如'用户管理表格'），确保 Executor 能一次性生成完整结构。\n" +
      "2. **交互性**：明确说明交互逻辑（如'提交后刷新下方列表'、'点击按钮打开包含表单的弹窗'）。\n" +
      "3. **数据绑定**：明确字段名及数据路径（如 '使用 ${rows} 作为源'）。\n" +
      "4. **布局意图**：若有多个任务，说明其相对位置（如'放置在页面顶部'）。"
    ),
    type: z.string().describe(
      "核心组件 Type。必须严格选择以下索引：\n" +
      "- 容器: page, service, form, wizard, dialog, drawer, wrapper, flex, grid, container\n" +
      "- 展示: table, cards, list, chart, tpl, json, image\n" +
      "- 功能: action, button, nav, tasks, divider\n" +
      "注意：严禁使用细粒度的 form-item-xxx 类型。"
    ),
    priority: z.number().describe("优先级：1=高, 2=中, 3=低"),
    dataDependencies: z.array(z.string()).optional().describe("该任务需要引用的数据结构中具体的字段名"),
    status: z.literal("pending").describe("初始状态，固定为 'pending'")
  })).min(1).max(3).describe("AMIS 任务规划列表。原则：少即是多（通常1-2个任务足以覆盖），除非用户明确要求API，否则默认使用静态 Mock 数据。")
});

/**
 * 1. 任务规划节点 (Planner Node)
 * 职责：分析用户需求，生成基于工具调用的结构化任务列表
 */
export async function planner_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  // 获取输入：用户原始需求或历史对话中的最后一项
  const userRequirement =
    state.userRequirement ||
    (state.messages[state.messages.length - 1] as HumanMessage).content;

  const processData = state.processData;

  // 检查是否在重试模式
  const failedTasks = (state.tasks || []).filter((t) => t.status === "failed");
  const isRetry = failedTasks.length > 0;

  console.log(`\n📋 [Planner] 分析用户需求: ${isRetry ? `(重试模式: ${failedTasks.length} 个任务失败)` : ""}`);

  const model = createChatModel({
    temperature: 0.1, // 降低随机性以确保严格遵循工具描述
  });

  // --- 2. 极其简化的 Prompt：只负责传递上下文 ---
  let promptText = `请分析以下用户需求，通过调用 generate_amis_tasks 规划高效的实施任务：

[用户需求]
${userRequirement}`;

  if (processData) {
    promptText += `\n\n[相关数据结构定义]
${JSON.stringify(processData.dataStructure, null, 2)}`;
  }

  if (isRetry) {
    promptText += `\n\n🚨 注意：之前的任务执行失败，请根据错误信息调整规划策略：
${failedTasks.map((t) => `- 计划: ${t.description}\n  错误提示: ${t.errorMessage}`).join("\n")}`;
  }

  // 构建支持结构化输出的模型
  const modelWithStructuredOutput = model.withStructuredOutput(PLAN_TASKS_SCHEMA, {
    name: "generate_amis_tasks",
  });

  // 设置流式状态预测元数据（用于前端实时显示任务骨架）
  if (!config.metadata) config.metadata = {};
  config.metadata.predict_state = [{
    state_key: "tasks",
    tool: "generate_amis_tasks",
    tool_argument: "tasks",
  }];

  let tasks: Task[] = [];
  try {
    const output = await modelWithStructuredOutput.invoke([
      new SystemMessage("你是一个 amis 页面规划专家。你必须调用 generate_amis_tasks 工具。请务必结合工具参数描述中的组件索引、粗粒度聚合原则和默认静态数据原则来输出方案。"),
      new HumanMessage({ content: promptText }),
    ]);

    if (output && output.tasks) {
      tasks = output.tasks.map((t) => ({
        ...t,
        docPaths: [], 
        status: "pending" as const,
        retryCount: 0
      }));
    }
  } catch (e) {
    console.error("FATAL: Planner LLM call failed.", e);
    tasks = [
      {
        id: "task-error",
        description: "任务规划失败: " + ((e as any).message || "Unknown error"),
        type: "error",
        priority: 1,
        docPaths: [],
        status: "failed",
      },
    ];
  }

  // 如果完全没有生成任务，提供一个兜底
  if (tasks.length === 0) {
    tasks = [{
      id: "task-1",
      description: "基于需求生成完整的 amis 配置 (Fallback)",
      type: "page",
      priority: 1,
      docPaths: [],
      status: "pending",
    }];
  }

  // 记录执行事件
  const event: ExecutionEvent = {
    type: "task_start",
    timestamp: new Date().toISOString(),
    message: `任务拆解完成: [${tasks.map(t => t.type).join(', ')}]`,
  };

  // 手动推送当前状态给前端（实现 UI 的即时同步）
  await dispatchCustomEvent(
    "manually_emit_state", 
    {
      tasks,
      executionLog: [...(state.executionLog || []), event]
    }, 
    config
  );

  return {
    tasks,
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [...(state.executionLog || []), event],
    userRequirement: userRequirement as string,
    needsReplan: false,
    schemaVersion: state.schemaVersion || 0,
  };
}
