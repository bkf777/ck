import { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../../utils/model-factory.js";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";

/**
 * 2.3 JSON 修复节点 (Fixer Node)
 * 职责：当 JSON 解析失败时，根据错误信息重新生成
 */
export async function fixer_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];
  const task = tasks[currentIndex];

  console.log(`
🛠️ [Fixer] 修复任务 ${task.id} 的 JSON 错误...`);

  const model = createChatModel({
    temperature: 0.2,
  });

  const prompt = `你是一个 JSON 修复专家。之前的任务生成了无效的 JSON。

任务描述：${task.description}
错误信息：${task.errorMessage}
原始输出内容：
${task.rawResult}

要求：
1. 请纠正 JSON 格式错误
2. 确保符合 amis 规范
3. 只返回修复后的 JSON 对象，不要有其他解释内容

修复后的 JSON：`;

  const response = await model.invoke([
    new SystemMessage({ content: "你是 JSON 修复专家" }),
    new HumanMessage({ content: prompt }),
  ]);

  const content = response.content as string;

  // 更新任务的 rawResult，然后再次进入 validator
  tasks[currentIndex].rawResult = content;
  tasks[currentIndex].retryCount = (tasks[currentIndex].retryCount || 0) + 1;

  const event: ExecutionEvent = {
    type: "generation_progress",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: `尝试修复 JSON 错误 (重试次数: ${tasks[currentIndex].retryCount})`,
  };

  return {
    tasks,
    executionLog: [...(state.executionLog || []), event],
  };
}
