import { RunnableConfig } from "@langchain/core/runnables";
import { AmisAgentState } from "../state.js";
import { parseJsonFromMarkdown } from "../utils.js";
import { ExecutionEvent } from "../types.js";

/**
 * 2.2 验证节点 (Validator Node)
 * 职责：验证执行结果是否为有效的 JSON，如果无效则标记为 json_error
 */
export async function validator_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];
  
  if (currentIndex >= tasks.length) {
    return {};
  }

  const task = tasks[currentIndex];
  console.log(`\n🔍 [Validator] 验证任务 ${task.id} 结果...`);

  // 如果没有 rawResult，说明执行可能失败了或者跳过了
  if (!task.rawResult) {
     // 如果已经是 failed，保持原样
     if (task.status === 'failed') return {};
     
     // 否则标记为 failed
     tasks[currentIndex].status = 'failed';
     tasks[currentIndex].errorMessage = "未获取到执行结果";
     return { tasks };
  }

  try {
    const json = parseJsonFromMarkdown(task.rawResult);
    
    // 验证成功
    tasks[currentIndex].result = json;
    tasks[currentIndex].status = 'completed';
    console.log(`✅ [Validator] 验证通过`);

    const event: ExecutionEvent = {
        type: "task_complete",
        timestamp: new Date().toISOString(),
        taskId: task.id,
        message: `任务 ${task.id} 验证通过`,
        data: json,
    };

    // 成功后推进任务索引
    return {
      tasks,
      currentTaskIndex: currentIndex + 1,
      executionLog: [...(state.executionLog || []), event],
    };

  } catch (error) {
    const err = error as Error;
    console.warn(`⚠️ [Validator] JSON 解析失败: ${err.message}`);
    
    tasks[currentIndex].status = 'json_error';
    tasks[currentIndex].errorMessage = err.message;

    return {
      tasks,
      // 不推进索引，停留在当前任务等待修复
      currentTaskIndex: currentIndex
    };
  }
}
