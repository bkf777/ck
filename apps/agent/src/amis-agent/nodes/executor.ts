import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { Command } from "@langchain/langgraph";
import {
  AIMessage,
  SystemMessage,
  ToolMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { convertActionsToDynamicStructuredTools } from "@copilotkit/sdk-js/langgraph";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";

/**
 * 2. 任务执行节点 (Executor Node)
 * 职责：执行单个子任务，生成对应的 amis JSON 配置
 */
// TODO: 提示词需要修改
export async function executor_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];

  // 提取已完成的任务结果
  const existingResults = tasks
    .filter((t) => t.status === "completed" && t.result)
    .map((t) => t.result);

  // 检查是否还有任务需要执行
  if (currentIndex >= tasks.length) {
    console.log("\n✅ [Executor] 所有任务已完成");
    return { currentTaskIndex: currentIndex };
  }

  const task = tasks[currentIndex];

  console.log(
    `\n⚙️ [Executor] 执行任务 ${currentIndex + 1}/${tasks.length}: ${
      task.description
    }`,
  );

  // 更新任务状态
  tasks[currentIndex].status = "in_progress";

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 绑定工具
  // 移除 ...tools 以防止 Executor 调用检索工具导致递归深度过大
  // 文档检索已由 docs_associate 节点完成
  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions ?? []),
  ]);

  // 构建提示词
  const prompt = `你是 amis 配置生成专家。请根据任务描述生成符合规范的 amis JSON 配置。

任务描述：${task.description}
任务类型：${task.type}

用户整体需求：${state.userRequirement}

${
  existingResults.length > 0
    ? `已生成的组件：
${JSON.stringify(existingResults, null, 2)}

请确保新组件与已有组件能够正确组合。`
    : ""
}

${
  state.contextDocuments && state.contextDocuments.length > 0
    ? `以下是与本任务相关的文档摘录（供参考）：\n${state.contextDocuments
        .slice(0, 3)
        .map(
          (d, i) =>
            `【文档${i + 1}】${d.path}\n摘要：${d.summary || ""}\n示例：\n${(
              d.codeExamples || []
            )
              .slice(0, 1)
              .join("\n")}`,
        )
        .join("\n\n")}\n请遵循文档规范进行配置。`
    : ""
}

要求：
1. 只返回 JSON 对象，不要有其他内容
2. 必须包含 type、name 等必需属性
3. 参考 amis 官方文档的规范
4. 确保配置的完整性和可用性
5. 如果是表单项，需要包含 label 属性

请生成 amis JSON 配置：`;

  // 调用 LLM
  const response = await modelWithTools.invoke(
    [new HumanMessage({ content: prompt })],
    config,
  );

  let result: any = null;
  let errorMessage: string | undefined;

  // 检查是否有工具调用（CopilotKit 前端动作）
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(`📚 [Executor] 触发前端动作: ${response.tool_calls[0].name}`);
    return {
      tasks,
      currentTaskIndex: currentIndex,
      messages: [...(state.messages || []), response as AIMessage],
    };
  }

  // 解析响应内容
  try {
    const content = response.content;
    if (typeof content === "string") {
      // 多策略提取 JSON
      let jsonString = content.trim();

      // 策略1: 提取 ```json``` 代码块
      const jsonCodeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlockMatch) {
        jsonString = jsonCodeBlockMatch[1].trim();
      } else {
        // 策略2: 提取普通代码块
        const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1].trim();
        }
      }

      // 尝试解析
      try {
        result = JSON.parse(jsonString);
      } catch (parseError) {
        // 如果解析失败，尝试修复常见问题
        console.log("⚠️ [Executor] 首次解析失败，尝试修复 JSON...");
        // 移除多余的逗号
        jsonString = jsonString.replace(/,\s*([}\]])/g, "$1");
        // 再次尝试解析
        result = JSON.parse(jsonString);
      }

      console.log(`✅ [Executor] 成功生成配置`);
    } else if (typeof content === "object") {
      result = content[0].text;
    }

    // 更新任务状态
    tasks[currentIndex].status = "completed";
    tasks[currentIndex].result = result;
  } catch (error) {
    const err = error as Error;
    errorMessage = `JSON 解析失败: ${err.message}`;
    console.error(`❌ [Executor] ${errorMessage} ${JSON.stringify(response)}`);

    tasks[currentIndex].status = "failed";
    tasks[currentIndex].errorMessage = errorMessage;
    tasks[currentIndex].retryCount = (tasks[currentIndex].retryCount || 0) + 1;
  }

  // 添加执行日志
  const event: ExecutionEvent = {
    type: errorMessage ? "error" : "task_complete",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: errorMessage || `任务 ${task.id} 完成`,
    data: result,
  };

  // 生成临时 schema 用于前端展示进度
  const currentResults = tasks
    .filter((t) => t.status === "completed" && t.result)
    .map((t) => t.result);

  const tempSchema = {
    type: "page",
    body: currentResults,
  };

  const updateSchemaCall = new AIMessage({
    content: "更新页面 schema",
    tool_calls: [
      {
        id: `call_${Date.now()}_update_schema`,
        name: "updateAmisSchema",
        args: { schema: tempSchema },
      },
    ],
  });

  return {
    currentTaskIndex: currentIndex + 1,
    tasks,
    schema: tempSchema,
    executionLog: [...(state.executionLog || []), event],
    // 本轮用过的上下文清空，交给下个任务的 context 节点重新准备
    contextDocuments: [],
    messages: [...(state.messages || []), updateSchemaCall],
  };
}
