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
    
    // 1. 基础结构验证
    if (typeof json !== 'object' || json === null) {
        throw new Error("生成的结果不是有效的 JSON 对象");
    }
    if (!json.type && !Array.isArray(json)) {
        // 如果是数组可能是 body 内容，暂且允许；如果是对象必须有 type
        throw new Error("生成的组件配置缺少必需的 'type' 字段");
    }

    // 2. 数据依赖验证 (Data Dependency Check)
    const dataDeps = task.dataDependencies || [];
    if (dataDeps.length > 0) {
        const jsonStr = JSON.stringify(json);
        const missingFields = dataDeps.filter(field => !jsonStr.includes(field));
        
        if (missingFields.length > 0) {
            // 这是一个软性错误，我们记录警告，甚至可以拒绝通过
            // 这里选择抛出错误，强迫进入 Fixer 进行修复
            throw new Error(`生成配置未包含必需的数据字段: ${missingFields.join(", ")}。请确保使用了数据绑定语法（如 \${${missingFields[0]}}）。`);
        }
    }

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
