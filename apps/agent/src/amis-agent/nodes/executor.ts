import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { createChatModel } from "../../utils/model-factory.js";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import { parseJsonFromMarkdown, getMessageContentText } from "../utils.js";
import { setTimeout } from "timers/promises";

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
 * 定义 Amis 组件生成的 Schema
 */
const GENERATE_COMPONENT_SCHEMA = z.object({
  config: z
    .object({
      type: z.string().describe("组件类型"),
      title: z.string().optional().describe("组件标题"),
      name: z.string().optional().describe("字段名或组件名"),
      label: z.string().optional().describe("表单项标签"),
      className: z.string().optional().describe("CSS 类名"),
      mode: z.enum(["horizontal", "inline", "normal"]).optional().describe("布局模式"),
      style: z.record(z.any()).optional().describe("内联样式"),
      width: z.union([z.string(), z.number()]).optional(),
      height: z.union([z.string(), z.number()]).optional(),
      body: z.any().optional().describe("子内容"),
      items: z.any().optional().describe("列表项内容"),
      columns: z.array(z.any()).optional().describe("表格列定义"),
      data: z.record(z.any()).optional().describe("静态数据对象"),
      source: z.string().optional().describe("数据源绑定表达式"),
      api: z.any().optional().describe("API 配置"),
      initApi: z.any().optional().describe("初始化 API 配置"),
      value: z.any().optional().describe("默认值"),
      placeholder: z.string().optional().describe("占位提示"),
      options: z.array(z.any()).optional().describe("选项列表"),
      validations: z.any().optional().describe("验证规则"),
      disabled: z.boolean().optional().describe("是否禁用"),
      visible: z.boolean().optional().describe("是否可见"),
      hidden: z.boolean().optional().describe("是否隐藏"),
      required: z.boolean().optional().describe("是否必填"),
      actionType: z.string().optional().describe("动作类型"),
      level: z.string().optional().describe("按钮级别"),
      target: z.string().optional().describe("目标组件或窗口"),
      confirmText: z.string().optional().describe("确认文案"),
      onEvent: z.record(z.any()).optional().describe("事件动作配置"),
    })
    .passthrough()
    .describe("完整的 Amis 组件 JSON 配置对象"),
});

/**
 * 2. 任务执行节点 (Executor Node)
 * 职责：执行单个子任务，生成对应的 amis JSON 配置
 */
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

  // --- 1. 状态更新：In Progress ---
  const updatedTasks = [...tasks];
  updatedTasks[currentIndex] = { ...updatedTasks[currentIndex], status: "in_progress" };

  const nextVersionForStart = (state.schemaVersion || 0) + 1;
  const progressSchema = {
    type: "page",
    title: "正在构建中...",
    body: [
      ...existingResults.map((comp) => ({
        type: "container",
        className: "mb-4 opacity-50",
        body: comp,
      })),
    ],
  };

  // 推送状态更新
  await dispatchCustomEvent(
    "manually_emit_state",
    {
      tasks: updatedTasks,
      schema: progressSchema,
      schemaVersion: nextVersionForStart,
    },
    config,
  );

  // 🛡️ 强制等待 500ms，确保前端有时间接收并渲染 "in_progress" 状态
  // 这是为了弥补 LangGraph 在同一节点内不自动推送 Checkpoint 的限制
  await setTimeout(500);

  // --- 2. LLM 生成 ---
  const model = createChatModel({
    temperature: 0.1,
  });

  const simplifiedResults = existingResults.map(getLightweightSchema);
  const processData = state.processData;

  let prompt = `你是 amis 配置生成专家。你的目标是生成**美观、现代、专业**的 UI 组件。
请调用工具 \`generate_amis_component\` 来提交你的配置。

【设计规范 (Design System)】
1. **风格**: 使用类似 Ant Design 或 Tailwind 的现代风格。
2. **布局**:
   - 使用 \`card\` 包裹主要内容区域。
   - 使用 \`flex\` 进行水平排列。
3. **颜色与间距**:
   - 必须使用 CSS 类名美化：\`className: "p-4 bg-white rounded-lg shadow-sm mb-4"\`。
   - 标题使用 \`text-lg font-bold mb-4\`。
4. **交互**: 按钮使用 \`level: "primary"\`。

任务描述：${task.description}
任务类型：${task.type}

用户整体需求：${state.userRequirement}`;

  if (processData && processData.dataStructure) {
    prompt += `\n\n【可用数据上下文】
数据描述: ${processData.dataMeta?.description || "无"}
数据结构样本: 
${JSON.stringify(processData.dataStructure, null, 2)}

【数据绑定要求】
1. 优先使用上下文中的数据，通过 "\${variable}" 引用。
2. 列表组件使用 source 绑定数组路径。`;
  } else {
    prompt += `\n\n【数据源处理规则】(重要!!!)
1. **默认使用 Mock 数据**：除非用户明确要求 API，否则不要配置 API。
2. **内嵌数据**：请直接在组件配置中通过 'data' 或 'source' 属性注入 Mock 数据。`;
  }

  if (simplifiedResults.length > 0) {
    prompt += `\n\n已生成的组件（摘要）：
${JSON.stringify(simplifiedResults, null, 2)}
请确保新组件与已有组件能够正确组合。`;
  }

  if (state.contextDocuments && state.contextDocuments.length > 0) {
    prompt += `\n\n【严格遵循参考文档】
${state.contextDocuments.slice(0, 3).map(d => d.summary).join("\n")}
`;
  }

  const modelWithStructuredOutput = model.withStructuredOutput(
    GENERATE_COMPONENT_SCHEMA,
    { name: "generate_amis_component" },
  );

  let output;
  try {
    output = await modelWithStructuredOutput.invoke(
      [new HumanMessage({ content: prompt })],
      { callbacks: [] },
    );
  } catch (e) {
    console.error("FATAL: Executor Node LLM invoke failed", e);

    // 更新为错误状态
    const tasksWithError = [...updatedTasks]; // 基于最新的 updatedTasks
    tasksWithError[currentIndex] = {
      ...tasksWithError[currentIndex],
      status: "json_error",
      rawResult: "LLM Generation Failed (OutputParserException)",
      errorMessage: "Generation error: " + (e as Error).message,
    };

    await dispatchCustomEvent(
      "manually_emit_state",
      { tasks: tasksWithError },
      config,
    );

    return { tasks: tasksWithError };
  }

  // --- 3. 处理结果 ---
  let partialSchema = state.schema;
  let currentJson = null;

  try {
    if (!output || !output.config) {
      throw new Error("模型未生成有效的配置对象");
    }

    currentJson = output.config;

    // 更新结果
    const tasksWithResult = [...updatedTasks]; // 基于 updatedTasks
    tasksWithResult[currentIndex] = { 
        ...tasksWithResult[currentIndex], 
        result: currentJson, 
        status: "in_progress" 
    };

    const allResults = [
      ...existingResults.map((r) =>
        typeof r === "string" ? parseJsonFromMarkdown(r) : r,
      ),
      currentJson,
    ];

    partialSchema = {
      type: "page",
      title: "页面生成中...",
      body: [
        ...allResults.map((comp, idx) => ({
          type: "container",
          className: "mb-4 animate-fade-in",
          body: comp,
        })),
      ],
    };

    const event: ExecutionEvent = {
      type: "generation_progress",
      timestamp: new Date().toISOString(),
      taskId: task.id,
      message: `任务 ${task.id} 配置已生成，准备进入验证阶段`,
    };

    const nextVersion = (state.schemaVersion || 0) + 1;

    return {
      tasks: tasksWithResult,
      schema: partialSchema,
      schemaVersion: nextVersion,
      executionLog: [...(state.executionLog || []), event],
      contextDocuments: [],
    };

  } catch (e) {
    console.warn("Partial preview generation failed", e);
    
    const tasksWithError = [...updatedTasks];
    tasksWithError[currentIndex] = { 
        ...tasksWithError[currentIndex], 
        rawResult: output ? JSON.stringify(output, null, 2) : "No Output",
        status: "json_error",
        errorMessage: (e as Error).message
    };
    
    return { tasks: tasksWithError };
  }
}