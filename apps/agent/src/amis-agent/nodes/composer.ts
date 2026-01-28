import { RunnableConfig } from "@langchain/core/runnables";
import { createChatModel } from "../../utils/model-factory.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import { parseJsonFromMarkdown } from "../utils.js";

/**
 * 3. 结果综合节点 (Composer Node)
 * 职责：将所有子任务的输出组合成完整的 amis JSON
 */
export async function composer_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  console.log("\n🎼 [Composer] 开始综合结果...");

  const tasks = state.tasks || [];
  // 从 tasks 中提取执行结果
  const taskResults = tasks
    .filter((t) => t.status === "completed" && t.result)
    .map((t) => parseJsonFromMarkdown(t.result));
  
  // 获取处理后的数据
  const processData = state.processData;

  console.log(`📊 [Composer] 已有 ${taskResults.length} 个组件需要综合`);

  // 定义模型
  const model = createChatModel({
    temperature: 0.3,
    maxTokens: 8192, // 综合阶段可能生成较大的 JSON，确保 Token 足够
  });

  // 如果有任务结果，综合它们
  if (taskResults.length > 0) {
    // 构建提示词
    let prompt = `你是 amis 配置综合专家。请将以下组件综合成一个完整的 amis JSON 配置。

已生成的组件：
${JSON.stringify(taskResults, null, 2)}`;

    // 如果有数据上下文，注入到提示词
    if (processData && processData.dataStructure) {
      prompt += `\n\n【全局数据上下文】
请将以下数据作为页面的初始数据（root data）：
${JSON.stringify(processData.dataStructure, null, 2)}`;
    }

    prompt += `\n\n综合要求：
1. 将所有组件组合成完整的页面配置 (type: "page")
2. 如果存在【全局数据上下文】，务必将其完整注入到根节点的 \`data\` 属性中，以便子组件可以通过 \`source\` 或变量映射访问。
3. 如果是表单组件，放入 form 的 body 中
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
      const finalJson = parseJsonFromMarkdown(content);

      console.log("✅ [Composer] 综合完成");
      console.log(finalJson);

      // 添加执行日志
      const event: ExecutionEvent = {
        type: "task_complete",
        timestamp: new Date().toISOString(),
        message: "结果综合完成",
        data: finalJson,
      };

      return {
        schema: finalJson,
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
        schema: fallbackJson,
        error: `综合失败: ${err.message}`,
      };
    }
  } else {
    console.log("⚠️ [Composer] 没有组件需要综合");
    return {
      schema: {
        type: "page",
        body: [],
      },
    };
  }
}
