import { RunnableConfig } from "@langchain/core/runnables";
import { createChatModel } from "../../utils/model-factory.js";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import { parseJsonFromMarkdown, getMessageContentText } from "../utils.js";

/**
 * 4. 综合节点 (Composer Node)
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
1. **结构化组装**：将所有已生成的组件合理安排在页面 (type: "page") 的 \`body\` 中。
2. **响应式布局**：根据组件特点，利用 Amis 的布局容器（如 grid, flex, container）或 CSS 类名，确保页面在不同屏幕尺寸下有良好的展示效果。
3. **数据注入**：务必将【全局数据上下文】注入到根节点的 \`data\` 属性中。
4. **禁止过度设计**：
   - 保持组件原有的配置，**严禁** 擅自添加新的 API 接口或复杂的业务逻辑。
   - 除非是为了布局美观（如添加 divider 或对齐），否则不要增加新的功能组件。
5. **纯净输出**：只返回最终的 JSON 对象，不要有任何 Markdown 标记或解释文字。

请生成综合后的 amis JSON 配置：`;

    const response = await model.invoke([
      new SystemMessage({ content: "你是 amis 配置综合专家" }),
      new HumanMessage({ content: prompt }),
    ]);

    try {
      const content = getMessageContentText(response.content);
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
        messages: [new AIMessage({ content: "已为您生成 Amis 页面配置。" })],
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
