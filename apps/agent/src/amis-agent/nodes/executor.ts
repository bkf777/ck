import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { createChatModel } from "../../utils/model-factory.js";
import { Command } from "@langchain/langgraph";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
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
  const model = createChatModel({
    temperature: 0.3,
  });

  console.log(state.copilotkit?.actions);

  // 移除工具绑定，强制模型只生成文本 JSON
  // 之前的绑定导致模型尝试调用工具而不是生成配置，导致 rawResult 为空引发死循环
  const modelWithTools = model;

  // 对已有结果进行精简，避免 Context 过大
  const simplifiedResults = existingResults.map(getLightweightSchema);

  // 获取结构化数据信息
  const processData = state.processData;

  // 构建提示词
  let prompt = `你是 amis 配置生成专家。请根据任务描述生成符合规范的 amis JSON 配置。

任务描述：${task.description}
任务类型：${task.type}

用户整体需求：${state.userRequirement}`;

  // 注入数据上下文
  if (processData && processData.dataStructure) {
    prompt += `\n\n【可用数据上下文】
数据描述: ${processData.dataMeta?.description || "无"}
数据结构样本: 
${JSON.stringify(processData.dataStructure, null, 2)}

【数据绑定要求】
1. 当前任务依赖的数据字段: ${
      task.dataDependencies && task.dataDependencies.length > 0
        ? JSON.stringify(task.dataDependencies)
        : "未指定（请根据上下文推断）"
    }
2. **正确使用数据映射**：请参考 Amis 数据映射文档，灵活用 "\${variable}" 或 "\${a.b}"（链式取值）获取数据。
3. **列表/数组数据源**：对于列表、表格、卡片等组件，**必须**使用 \`source\` 属性绑定数组路径（如 source: "\${rows}"）。请勿使用 \`data\` 属性直接绑定数组。
4. **字段引用 vs 映射**：
   - 定义组件字段名（如 Table 的 columns 或 Input 的 name）时，直接使用字段名字符串（如 name: "userName"）。
   - 需要展示数据值（如 tpl, text, label 属性）时，才使用数据映射语法（如 tpl: "当前用户: \${userName}"）。
5. **作用域与路径**：
   - 列表项内部直接使用相对路径变量（如 "\${month}"）。
   - 顶层数据使用完整路径（如 "\${summary.total}"）。
6. **禁止硬编码**：所有业务数据必须通过 "\${...}" 绑定，严禁写入静态值。`;
  }

  if (simplifiedResults.length > 0) {
    prompt += `\n\n已生成的组件（摘要）：
${JSON.stringify(simplifiedResults, null, 2)}

请确保新组件与已有组件能够正确组合。`;
  }

  if (state.contextDocuments && state.contextDocuments.length > 0) {
    prompt += `\n\n以下是与本任务相关的文档摘录（供参考）：\n${state.contextDocuments
        .slice(0, 3)
        .map(
          (d, i) =>
            `【文档${i + 1}】${d.path}\n摘要：${d.summary || ""}\n示例：\n${(
              d.codeExamples || []
            )
              .slice(0, 1)
              .join("\n")}`,
        )
        .join("\n\n")}\n请遵循文档规范进行配置。`;
  }

  prompt += `

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
    return {
      tasks: tasks.map((t, i) =>
        i === currentIndex
          ? {
              ...t,
              status: "failed",
              errorMessage: "Agent network error: " + (e as Error).message,
            }
          : t,
      ),
    };
  }

  // 获取原始响应内容并保存
  const content = response.content;
  let rawResult = "";
  if (typeof content === "string") {
    rawResult = content;
  } else if (Array.isArray(content) && content[0]?.text) {
    rawResult = content[0].text;
  }

  tasks[currentIndex].rawResult = rawResult;
  tasks[currentIndex].status = "in_progress";

  console.log(`📡 [Executor] 任务 ${task.id} 生成原始配置完成，进入验证阶段`);

  const event: ExecutionEvent = {
    type: "generation_progress",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: `任务 ${task.id} 已生成原始配置，准备验证...`,
  };

  return {
    tasks,
    executionLog: [...(state.executionLog || []), event],
    // 本轮用过的上下文清空
    contextDocuments: [],
  };
}
