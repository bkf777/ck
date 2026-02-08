import { RunnableConfig } from "@langchain/core/runnables";
import { createChatModel } from "../../utils/model-factory.js";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
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
    let prompt = `你的**首要目标**是将提供的组件拼装成一个**布局合理**的 amis 页面。

**核心原则（必须严格遵守）：**
1. **绝对禁止修改组件内部配置**：将输入的组件视为**不可变**的黑盒。不要尝试优化、重写或"修复"组件内部的任何属性（如 \`api\`, \`columns\`, \`body\` 等）。
2. **仅做布局组装**：你的工作只限于在组件外层包裹布局容器（如 \`wrapper\`, \`grid\`, \`hbox\` 等）或添加分隔符。
3. **保持原样**：如果输入的组件已经是完整的配置，直接返回即可，不要画蛇添足。

已生成的组件（不可变块）：
${JSON.stringify(taskResults, null, 2)}`;

    // 如果有数据上下文，注入到提示词
    if (processData && processData.dataStructure) {
      prompt += `\n\n【全局数据上下文】
请将以下数据作为页面的初始数据（root data）：
${JSON.stringify(processData.dataStructure, null, 2)}`;
    }

    prompt += `\n\n组装要求：
1. **页面结构**：
   - 必须创建一个 \`type: "page"\` 的根节点。
   - 使用 \`wrapper\` 或 \`container\` 对主要内容进行包裹，可以添加 \`className: "p-6 bg-gray-50 min-h-screen"\` 以提供背景。
2. **布局优化**：
   - 如果组件之间需要间距，请在组件之间插入 \`{ type: "divider", className: "my-4" }\` 或使用 \`gap\` 类。
   - 不要修改组件本身的 \`className\`，只在容器层级调整布局。
3. **数据注入**：务必将【全局数据上下文】注入到根节点的 \`data\` 属性中。
4. **纯净输出**：只返回最终的 JSON 对象，不要有任何 Markdown 标记或解释文字。

请生成组装后的 amis JSON 配置：`;

    const response = await model.invoke(
      [
        new SystemMessage({
          content:
            "你是 amis 布局组装工程师。你只负责将组件拼装成页面，绝不修改组件内部逻辑。",
        }),
        new HumanMessage({ content: prompt }),
      ],
      { callbacks: [] },
    ); // 🚫 禁止回调，防止流式传输巨大的 JSON 字符串到聊天界面

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
        // 💡 优化：不再将完整的 JSON 塞入日志，因为它已经在 schema 字段里了
      };

      // 增加版本号，确保前端感知到最终综合结果
      const nextVersion = (state.schemaVersion || 0) + 1;

      return {
        schema: finalJson,
        schemaVersion: nextVersion,
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
