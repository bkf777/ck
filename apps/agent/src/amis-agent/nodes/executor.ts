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
 * 使用 passthrough 允许灵活的属性
 */
const GENERATE_COMPONENT_SCHEMA = z.object({
  config: z
    .object({
      type: z
        .string()
        .describe(
          "组件类型，如 page, form, table, tpl, card, service, crud, action, button 等",
        ),
      title: z.string().optional().describe("组件标题"),
      name: z.string().optional().describe("字段名或组件名"),
      label: z.string().optional().describe("表单项标签"),
      className: z.string().optional().describe("CSS 类名"),

      // 布局与样式
      mode: z
        .enum(["horizontal", "inline", "normal"])
        .optional()
        .describe("布局模式"),
      style: z.record(z.any()).optional().describe("内联样式"),
      width: z.union([z.string(), z.number()]).optional(),
      height: z.union([z.string(), z.number()]).optional(),

      // 容器与子节点
      body: z.any().optional().describe("子内容 (Array<Schema> | Schema)"),
      items: z.any().optional().describe("列表项内容 (Array<Schema>)"),
      columns: z
        .array(z.any())
        .optional()
        .describe("表格列定义或 Grid 列定义 (Array<Column>)"),

      // 数据与API
      data: z.record(z.any()).optional().describe("静态数据对象"),
      source: z.string().optional().describe("数据源绑定表达式 (如 ${items})"),
      api: z.any().optional().describe("API 配置"),
      initApi: z.any().optional().describe("初始化 API 配置"),

      // 表单与输入
      value: z.any().optional().describe("默认值"),
      placeholder: z.string().optional().describe("占位提示"),
      options: z
        .array(z.any())
        .optional()
        .describe("选项列表 (Array<{label, value}>)"),
      validations: z.any().optional().describe("验证规则"),
      disabled: z.boolean().optional().describe("是否禁用"),
      visible: z.boolean().optional().describe("是否可见"),
      hidden: z.boolean().optional().describe("是否隐藏"),
      required: z.boolean().optional().describe("是否必填"),

      // 动作与交互
      actionType: z
        .string()
        .optional()
        .describe("动作类型 (ajax, dialog, drawer, link, url, toast 等)"),
      level: z
        .string()
        .optional()
        .describe("按钮级别 (primary, danger, enhance, link, info 等)"),
      target: z.string().optional().describe("目标组件或窗口"),
      confirmText: z.string().optional().describe("确认文案"),
      onEvent: z.record(z.any()).optional().describe("事件动作配置"),
    })
    .passthrough() // 允许 schema 中未定义的其他 amis 属性
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

  // 更新任务状态
  tasks[currentIndex].status = "in_progress";
  await dispatchCustomEvent(
    "manually_emit_state",
    {
      tasks,
    },
    config,
  );

  // 定义模型
  const model = createChatModel({
    temperature: 0.1, // 降低随机性，确保结构化输出准确
  });

  // 对已有结果进行精简，避免 Context 过大
  const simplifiedResults = existingResults.map(getLightweightSchema);

  // 获取结构化数据信息
  const processData = state.processData;

  // 构建提示词
  let prompt = `你是 amis 配置生成专家。你的目标是生成**美观、现代、专业**的 UI 组件。
请调用工具 \`generate_amis_component\` 来提交你的配置。

【设计规范 (Design System)】
1. **风格**: 使用类似 Ant Design 或 Tailwind 的现代风格。避免默认的粗糙样式。
2. **布局**:
   - 使用 \`card\` 包裹主要内容区域，添加 \`mode: "horizontal"\` 或适当的 padding。
   - 使用 \`flex\` 进行水平排列，配合 \`gap-4\`, \`items-center\`。
3. **颜色与间距**:
   - 必须使用 CSS 类名美化：\`className: "p-4 bg-white rounded-lg shadow-sm mb-4"\`。
   - 标题使用 \`text-lg font-bold mb-4\`。
4. **交互**: 按钮使用 \`level: "primary"\` 或 \`level: "enhance"\`，避免全部默认灰色。

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
1. 优先使用上下文中的数据，通过 "\${variable}" 引用。
2. 列表组件使用 
source
 绑定数组路径。`;
  } else {
    prompt += `\n\n【数据源处理规则】(重要!!!)
1. **默认使用 Mock 数据**：除非用户在描述中明确提到 
'api'、'接口'、'后端' 或 'Fetch'，否则 **不要** 配置 
'api'
 属性。
2. **内嵌数据**：请直接在组件配置中通过 
'data'
 (Page/Form级别) 或 
'source'
 (Table/List级别) 属性注入符合业务场景的静态 Mock 数据。
   - 例如 Table 组件：设置 
'source: "\${items}"'
 并在外层或当前层级定义 
'data: { items: [...] }'
。
   - 或者直接在 CRUD/Table 中写死 
'data: { items: [...] }'
 (如果是纯静态展示)。`;
  }

  prompt += `\n\n【数据映射语法规范】(Critical)
1. **对象属性访问**：必须使用点号（.）访问对象属性。
   - ✅ 正确：
platformWorksNumDist.youtube
   - ❌ 错误：
platformWorksNumDist | pick: youtube
   - ❌ 错误：
\${variable}platformWorksNumDist | raw: youtube
2. **变量引用**：始终使用 
variableName
 格式。

【自检清单】
- [ ] 是否添加了美化类名 (shadow-sm, rounded, p-4)？
- [ ] 是否正确使用了点号 (.) 访问对象属性？
- [ ] 如果是 Table/List，是否包含了 
'data'
 或 
'source'
 形式的 Mock 数据？
`;

  if (simplifiedResults.length > 0) {
    prompt += `\n\n已生成的组件（摘要）：
${JSON.stringify(simplifiedResults, null, 2)}

请确保新组件与已有组件能够正确组合。`;
  }

  if (state.contextDocuments && state.contextDocuments.length > 0) {
    prompt += `\n\n【严格遵循参考文档】
你必须优先参考以下文档中的 Props 定义和 Schema 结构，**严禁猜测**组件属性：
${state.contextDocuments
      .slice(0, 3)
      .map(
        (d, i) =>
          `--- 文档片段 ${i + 1} (${d.path}) ---\n${d.content ? d.content.slice(0, 800) : (d.summary || "无内容")}\n--- 结束 ---`,
      )
      .join("\n\n")}
`;
  }

  prompt += `

要求：
1. 必须包含 type、name 等必需属性
2. 参考 amis 官方文档的规范
3. 确保配置的完整性和可用性
4. 如果是表单项，需要包含 label 属性

请生成 amis JSON 配置：`;

  // 绑定工具
  const modelWithStructuredOutput = model.withStructuredOutput(
    GENERATE_COMPONENT_SCHEMA,
    {
      name: "generate_amis_component",
    },
  );

  // 调用 LLM
  let output;
  try {
    output = await modelWithStructuredOutput.invoke(
      [new HumanMessage({ content: prompt })],
      { callbacks: [] },
    ); // 🚫 禁止回调
  } catch (e) {
    console.error("FATAL: Executor Node LLM invoke failed", e);

    const updatedTasks = tasks.map((t, i) =>
      i === currentIndex
        ? {
            ...t,
            status: "failed" as const,
            errorMessage: "Agent network error: " + (e as Error).message,
          }
        : t,
    );

    await dispatchCustomEvent(
      "manually_emit_state",
      {
        tasks: updatedTasks,
      },
      config,
    );

    return {
      tasks: updatedTasks,
    };
  }

  // --- 处理生成结果 ---
  let partialSchema = state.schema;
  let currentJson = null;

  try {
    if (!output || !output.config) {
      throw new Error("模型未生成有效的配置对象");
    }

    currentJson = output.config;

    // 💡 核心优化：解析成功后立即放入 result
    tasks[currentIndex].result = currentJson;

    // 收集所有已有的结果 (已完成 + 当前)
    const allResults = [
      ...existingResults.map((r) =>
        typeof r === "string" ? parseJsonFromMarkdown(r) : r,
      ),
      currentJson,
    ];

    partialSchema = {
      type: "page",
      title: "页面生成中...",
      body: allResults.map((comp, idx) => ({
        type: "container",
        className: "mb-4 animate-fade-in",
        body: comp,
      })),
    };
  } catch (e) {
    console.warn(
      "Partial preview generation failed or Invalid output, keeping rawResult for fixer:",
      e,
    );
    // 如果解析失败，才保留 rawResult 给 fixer 处理 (这里 rawResult 可能是空或者 JSON 字符串化的 output)
    // 既然使用了 Structured Output，如果 output 为空通常意味着模型拒绝执行或出错
    // 我们尽量把 output 转为 string 给 fixer 看看
    tasks[currentIndex].rawResult = output
      ? JSON.stringify(output, null, 2)
      : "No Output";
    tasks[currentIndex].status = "json_error";
    tasks[currentIndex].errorMessage = (e as Error).message;
  }
  // -------------------------

  const event: ExecutionEvent = {
    type: "generation_progress",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: `任务 ${task.id} 配置已生成，准备进入验证阶段`,
  };

  const nextVersion = (state.schemaVersion || 0) + 1;

  return {
    tasks,
    schema: partialSchema,
    schemaVersion: nextVersion,
    executionLog: [...(state.executionLog || []), event],
    contextDocuments: [],
  };
}