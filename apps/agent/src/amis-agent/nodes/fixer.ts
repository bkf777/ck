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

  const prompt = `你是一个 amis 配置修复专家。之前的生成结果未能通过验证。

任务描述：${task.description}
错误信息：${task.errorMessage}

原始生成内容：
${task.rawResult}

【可用数据上下文】
${
  state.processData && state.processData.dataStructure
    ? `数据结构: ${JSON.stringify(state.processData.dataStructure, null, 2)}`
    : "无数据上下文"
}
数据依赖: ${JSON.stringify(task.dataDependencies || [])}

修复指导：
1. 如果是 JSON 格式错误，请修正语法（如闭合括号、引号）。
2. 如果是"未包含必需的数据字段"错误，请修改配置，确保使用 \${variable} 语法正确引用了缺失的字段。
3. 参考数据结构，确保绑定的路径正确。
4. 只返回修复后的 JSON 对象，不要有其他解释内容。

请输出修复后的 JSON：`;

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
