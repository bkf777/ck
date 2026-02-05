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
    temperature: 0.3,
  });

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
- [ ] 是否正确使用了点号 (.) 访问对象属性？
- [ ] 如果是 Table/List，是否包含了 
'data'
 或 
'source'
 形式的 Mock 数据？
- [ ] 是否避免了配置未请求的 API？
`;

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
    response = await model.invoke([new HumanMessage({ content: prompt })]);
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

  // 获取原始响应内容
  const rawResult = getMessageContentText(response.content);

  // --- 尝试解析并生成预览 ---
  let partialSchema = state.schema;
  let currentJson = null;

  try {
    currentJson = parseJsonFromMarkdown(rawResult);
    
    // 💡 核心优化：解析成功后立即放入 result 并把原文本清空，不让 rawResult 进入状态流
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
        type: "wrapper",
        className:
          "border-2 border-dashed border-blue-200 p-2 mb-2 rounded relative",
        body: [
          {
            type: "tpl",
            tpl: `<div class="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-bl">Part ${idx + 1}</div>`,
          },
          comp,
        ],
      })),
    };
  } catch (e) {
    console.warn("Partial preview generation failed, keeping rawResult for fixer:", e);
    // 如果解析失败，才保留 rawResult 给 fixer 处理
    tasks[currentIndex].rawResult = rawResult;
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
