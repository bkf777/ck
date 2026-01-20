import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";

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
    .map((t) => t.result);
  const userRequirement = state.userRequirement;

  console.log(`📊 [Composer] 已有 ${taskResults.length} 个组件需要综合`);

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 如果有任务结果，综合它们
  if (taskResults.length > 0) {
    // 构建提示词
    const prompt = `你是 amis 配置综合专家。请将以下组件综合成一个完整的 amis JSON 配置。

用户需求：${userRequirement}

已生成的组件：
${JSON.stringify(taskResults, null, 2)}

综合要求：
1. 将所有组件组合成完整的页面配置
2. 如果是表单组件，放入 form 的 body 中
3. 如果是页面，包含 type: "page"
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
      console.log(typeof content);

      // 提取 JSON 内容的多种策略
      let jsonString = content;

      // 策略 1: 提取 ```json``` 代码块
      const jsonCodeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlockMatch) {
        jsonString = jsonCodeBlockMatch[1].trim();
      } else {
        // 策略 2: 提取普通代码块
        const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1].trim();
        }
      }

      // 清理可能的前后空白和注释
      jsonString = jsonString.trim();

      // 尝试解析 JSON
      let finalJson;
      try {
        finalJson = JSON.parse(jsonString);
      } catch (parseError) {
        // 如果解析失败，尝试修复常见问题
        console.log("⚠️ [Composer] 首次解析失败，尝试修复 JSON...");
        // 移除多余的逗号
        jsonString = jsonString.replace(/,\s*([}\]])/g, "$1");
        // 再次尝试解析
        finalJson = JSON.parse(jsonString);
      }

      console.log("✅ [Composer] 综合完成");
      console.log(JSON.stringify(finalJson, null, 2));

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
