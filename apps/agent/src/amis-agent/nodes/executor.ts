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
import { parseJsonFromMarkdown } from "../utils.js";

/**
 * 简化 Schema，只保留关键结构字段，减少 Token 消耗
 */
function getLightweightSchema(schema: any): any {
  if (Array.isArray(schema)) {
    return schema.map(getLightweightSchema);
  }
  if (typeof schema === "object" && schema !== null) {
    // 保留关键识别字段
    const keepFields = ["type", "name", "id", "title", "label", "actionType"];
    const result: any = {};
    keepFields.forEach((key) => {
      if (schema[key]) result[key] = schema[key];
    });

    // 递归处理 body/items 等容器字段，但只保留结构概览
    if (schema.body) {
      result.body = Array.isArray(schema.body)
        ? schema.body.map(getLightweightSchema)
        : getLightweightSchema(schema.body);
    }
    if (schema.items) {
      result.items = Array.isArray(schema.items)
        ? schema.items.map(getLightweightSchema)
        : getLightweightSchema(schema.items);
    }
    // 处理 tabs 等特殊容器
    if (schema.tabs && Array.isArray(schema.tabs)) {
      result.tabs = schema.tabs.map(getLightweightSchema);
    }

    // 如果没有任何关键字段，且不是容器，返回简略类型
    if (Object.keys(result).length === 0) {
      return { type: schema.type || "unknown" };
    }
    return result;
  }
  return schema;
}

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
    `\n⚙️ [Executor] 执行任务 ${currentIndex + 1}/${tasks.length}: ${task.description}`,
  );

  // 更新任务状态
  tasks[currentIndex].status = "in_progress";

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: process.env.ANTHROPIC_MODEL || "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 绑定工具
  // 移除 ...tools 以防止 Executor 调用检索工具导致递归深度过大
  // 文档检索已由 docs_associate 节点完成
  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions ?? []),
  ]);

  // 对已有结果进行精简，避免 Context 过大
  const simplifiedResults = existingResults.map(getLightweightSchema);

  // 构建提示词
  const prompt = `你是 amis 配置生成专家。请根据任务描述生成符合规范的 amis JSON 配置。

任务描述：${task.description}
任务类型：${task.type}

用户整体需求：${state.userRequirement}

${simplifiedResults.length > 0
    ? `已生成的组件（摘要）：
${JSON.stringify(simplifiedResults, null, 2)}

请确保新组件与已有组件能够正确组合。`
    : ""}

${state.contextDocuments && state.contextDocuments.length > 0
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
    : ""}

要求：
1. 只返回 JSON 对象，不要有其他内容
2. 必须包含 type、name 等必需属性
3. 参考 amis 官方文档的规范
4. 确保配置的完整性和可用性
5. 如果是表单项，需要包含 label 属性

请生成 amis JSON 配置：`;

  // 调用 LLM
  
  let response;
  try {
    response = await modelWithTools.invoke(
      [new HumanMessage({ content: prompt })],
      config,
    );
  } catch (e) {
    console.error("FATAL: Executor Node LLM invoke failed", e);
    // Return a failed task result immediately to avoid crash
    return {
        tasks: tasks.map((t, i) => i === currentIndex ? { ...t, status: 'failed', errorMessage: "Agent network error: " + e.message } : t),
        currentTaskIndex: currentIndex + 1,
    };
  }
  

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
      result = parseJsonFromMarkdown(content);
      console.log(`✅ [Executor] 成功生成配置`);
    } else if (typeof content === "object") {
      result = (content as any)[0].text;
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