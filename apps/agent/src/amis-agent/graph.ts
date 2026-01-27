import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver, START, StateGraph, END } from "@langchain/langgraph";
import { AIMessage, ToolMessage } from "@langchain/core/messages";

import { AgentStateAnnotation, AmisAgentState } from "./state.js";
import { tools } from "./tools.js";
import { input_processor_node } from "./nodes/input-processor.js";
import { experiment_allocator_node } from "./nodes/experiment-allocator.js";
import { planner_node } from "./nodes/planner.js";
import { docs_associate_node } from "./nodes/docs-associate.js";
import { context_node } from "./nodes/context.js";
import { executor_node } from "./nodes/executor.js";
import { validator_node } from "./nodes/validator.js";
import { fixer_node } from "./nodes/fixer.js";
import { composer_node } from "./nodes/composer.js";

// ============================================================
// 路由逻辑
// ============================================================

/**
 * 验证后的路由逻辑
 */
function route_after_validation(state: AmisAgentState): string {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];

  if (currentIndex < tasks.length) {
    const currentTask = tasks[currentIndex];

    // 如果 JSON 解析错误，进入修复节点
    if (currentTask.status === "json_error") {
      console.log(
        `🔀 [Route] 任务 ${currentTask.id} JSON 解析错误，跳转 -> fixer`,
      );
      return "fixer";
    }

    // 如果由于某种原因验证节点将其标记为失败（非 JSON 错误），回退到规划节点
    if (currentTask.status === "failed") {
      console.log(
        `🔀 [Route] 任务 ${currentTask.id} 验证失败，跳转 -> planner`,
      );
      return "planner";
    }
  }

  // 验证通过（已在 validator 中推进 currentIndex）或所有任务已处理
  return shouldContinue(state);
}

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
  console.log("🔀 [Route] 初始启动，跳转 -> experiment_allocator");
  return "experiment_allocator";
}

/**
 * A/B 测试路由
 */
function route_ab_test(state: AmisAgentState): string {
  if (state.abTestGroup === "B") {
    return "input_processor";
  }
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
  .addNode("experiment_allocator", experiment_allocator_node)
  .addNode("input_processor", input_processor_node)
  .addNode("planner", planner_node)
  // 文档关联节点：为所有任务批量检索并关联文档地址（只执行一次）
  .addNode("docs_associate", docs_associate_node)
  // 上下文注入节点：为当前任务准备具体的文档内容
  .addNode("context", context_node)
  .addNode("executor", executor_node)
  .addNode("validator", validator_node)
  .addNode("fixer", fixer_node)
  .addNode("composer", composer_node)

  // 添加边
  .addConditionalEdges(START, route_start, {
    experiment_allocator: "experiment_allocator",
    executor: "executor",
  })
  .addConditionalEdges("experiment_allocator", route_ab_test, {
    input_processor: "input_processor",
    planner: "planner",
  })
  .addEdge("input_processor", "planner")
  .addEdge("planner", "docs_associate")
  .addEdge("docs_associate", "context")
  .addEdge("context", "executor")
  .addEdge("executor", "validator")
  .addEdge("fixer", "validator")

  // 条件边：验证后的跳转逻辑
  .addConditionalEdges("validator", route_after_validation, {
    planner: "planner",
    context: "context",
    executor: "executor",
    composer: "composer",
    docs_associate: "docs_associate",
    fixer: "fixer",
    [END]: END,
  })

  .addEdge("composer", END);

// 编译工作流
const memory = new MemorySaver();
export const graph = workflow
  .compile({
    checkpointer: memory,
  })
  .withConfig({ recursionLimit: 50 });
