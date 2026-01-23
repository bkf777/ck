import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver, START, StateGraph, END } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";

import { AgentStateAnnotation, AmisAgentState } from "./state.js";
import { tools } from "./tools.js";
import { planner_node } from "./nodes/planner.js";
import { docs_associate_node } from "./nodes/docs-associate.js";
import { context_node } from "./nodes/context.js";
import { executor_node } from "./nodes/executor.js";
import { composer_node } from "./nodes/composer.js";

// ============================================================
// 路由逻辑
// ============================================================

/**
 * 判断启动路由
 */
function route_start(state: AmisAgentState): string {
  const messages = state.messages || [];
  const lastMessage = messages[messages.length - 1];
  // 如果最后一条消息是 ToolMessage，说明是工具执行返回，直接进入执行节点处理结果
  if (lastMessage && lastMessage.getType() === "tool") {
    console.log("🔀 [Route] 检测到工具输出，跳转 -> executor");
    return "executor";
  }
  console.log("🔀 [Route] 初始启动，跳转 -> planner");
  return "planner";
}

/**
 * 判断是否需要继续执行
 */
function shouldContinue(state: AmisAgentState): string {
  const currentIndex = state.currentTaskIndex || 0;
  const totalTasks = state.tasks?.length || 0;
  const tasks = state.tasks || [];

  // 若需要回到规划阶段（例如需求变化或失败后重规划）
  if (state.needsReplan) {
    console.log("🔀 [Route] 需要重新规划，跳转 -> planner");
    return "planner";
  }

  // 如果上一个已执行任务失败，则回到规划节点复盘/重拆
  const lastIndex = currentIndex - 1;
  if (
    lastIndex >= 0 &&
    state.tasks &&
    state.tasks[lastIndex] &&
    state.tasks[lastIndex].status === "failed"
  ) {
    console.log(
      `🔀 [Route] 任务 ${state.tasks[lastIndex].id} 失败，跳转 -> planner 进行修复`,
    );
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
        console.log(`🔀 [Route] 调用工具 ${toolCallName}，跳转 -> tool_node`);
        return "tool_node";
      }
      // 如果是 CopilotKit action，返回 END 让客户端处理
      console.log(
        `🔀 [Route] 触发 CopilotKit 动作 ${toolCallName}，跳转 -> END`,
      );
      return END;
    }
  }

  // 检查是否有需要重试的任务
  if (state.tasksToRetry && state.tasksToRetry.length > 0) {
    console.log("🔀 [Route] 有任务需要重试，跳转 -> executor");
    return "executor";
  }

  // 所有任务完成，进入综合阶段
  if (currentIndex >= totalTasks) {
    console.log("🔀 [Route] 所有任务已完成，跳转 -> composer");
    return "composer";
  }

  // 检查是否需要执行文档关联（只在第一次或文档未关联时执行）
  // 如果第一个任务还没有 docHints，说明还没有执行过文档关联
  if (tasks.length > 0 && !tasks[0].docHints) {
    console.log("🔀 [Route] 首次执行，需要关联文档，跳转 -> docs_associate");
    return "docs_associate";
  }

  // 准备当前任务的上下文文档
  console.log(
    `🔀 [Route] 准备执行任务 ${currentIndex + 1}/${totalTasks}，跳转 -> context`,
  );
  return "context";
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
  // 文档关联节点：为所有任务批量检索并关联文档地址（只执行一次）
  .addNode("docs_associate", docs_associate_node)
  // 上下文注入节点：为当前任务准备具体的文档内容
  .addNode("context", context_node)
  .addNode("executor", executor_node)
  .addNode("tool_node", new ToolNode(tools))
  .addNode("copilot_action_node", copilot_action_node)
  .addNode("composer", composer_node)

  // 添加边
  .addConditionalEdges(START, route_start, {
    planner: "planner",
    executor: "executor",
  })
  .addEdge("planner", "docs_associate")
  .addEdge("docs_associate", "context")
  .addEdge("context", "executor")
  .addEdge("tool_node", "executor")

  // 条件边：判断是否继续执行
  .addConditionalEdges("executor", shouldContinue, {
    planner: "planner",
    context: "context",
    executor: "executor",
    tool_node: "tool_node",
    composer: "composer",
    docs_associate: "docs_associate",
    [END]: END,
  })

  .addEdge("composer", END);

// 编译工作流
const memory = new MemorySaver();
export const graph = workflow.compile({
  checkpointer: memory,
});
