import { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { createChatModel } from "../../utils/model-factory.js";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";

/**
 * 输入处理节点 (Input Processor Node)
 * 职责：分析用户原始输入，分离"用户指令"与"处理数据"，并生成数据元信息
 */
export async function input_processor_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  console.log("\n📥 [InputProcessor] 开始处理用户输入...");

  // 获取最后一条用户消息
  const messages = state.messages || [];
  const lastUserMsg = messages
    .slice()
    .reverse()
    .find((m: BaseMessage) => m instanceof HumanMessage);

  const rawInput = lastUserMsg ? (lastUserMsg.content as string) : "";

  if (!rawInput) {
    console.log("⚠️ [InputProcessor] 未找到用户输入，跳过处理");
    return {};
  }

  // 定义模型
  const model = createChatModel({
    temperature: 0, // 使用低温度以获得确定的结构化输出
  });

  const prompt = `你是一个精准的数据分析与需求提取专家。你的核心任务是从用户的自然语言输入中，完美剥离"业务需求"与"数据实体"。

请遵循以下思维链进行处理：
1. **识别**：扫描输入内容，区分哪些是用户想做的事情（指令），哪些是操作对象（数据）。
2. **提取与清洗**：
   - 将数据部分从文本中提取出来。
   - 如果数据是松散的文本（如"张三18岁，李四20岁"），请结构化为 JSON 数组。
   - 如果数据是表格或类表格文本，请解析为 JSON。
   - 极其注意：不要篡改数据原本的值，但可以修正格式错误。
3. **元数据生成**：分析提取出的数据，生成描述其结构的 Schema。

### 输入示例与预期输出

**示例 1：混合输入**
*输入*："请帮我根据这些销售数据生成一个柱状图：一月 100，二月 200，三月 150"
*输出*：
\`\`\`json
{
  "requirement": "根据销售数据生成柱状图",
  "isDataPresent": true,
  "dataContent": [
    {"month": "一月", "value": 100},
    {"month": "二月", "value": 200},
    {"month": "三月", "value": 150}
  ],
  "dataMeta": {
    "type": "json",
    "description": "月度销售数据",
    "schema": {"month": "string", "value": "number"}
  }
}
\`\`\`

**示例 2：仅指令**
*输入*："帮我画一个空的表格模板"
*输出*：
\`\`\`json
{
  "requirement": "画一个空的表格模板",
  "isDataPresent": false,
  "dataContent": null,
  "dataMeta": {"type": "unknown", "description": "", "schema": {}}
}
\`\`\`

### 你的任务
用户输入：
${rawInput}

请返回符合上述格式的 JSON。只返回 JSON，不要包含 Markdown 代码块标记以外的任何解释。
`;

  let result: any = {};

  try {
    const response = await model.invoke([
      new SystemMessage({
        content: "你是一个精准的数据提取助手，只返回 JSON 格式的结果。",
      }),
      new HumanMessage({ content: prompt }),
    ]);

    const content = response.content as string;
    // 提取 JSON
    const jsonMatch = content.match(/```json[\s\S]*?\n([\s\S]*?)\n```/) || [
      null,
      content,
    ];
    const jsonStr = jsonMatch[1] || content;

    // 清理可能的非 JSON 字符（简单的容错）
    const cleanJson = jsonStr.replace(/^[^{]*({[\s\S]*})[^}]*$/, "$1");

    result = JSON.parse(cleanJson);
  } catch (e) {
    console.error("❌ [InputProcessor] 解析失败:", e);
    // 降级处理：把整个输入当作需求，无数据
    result = {
      requirement: rawInput,
      isDataPresent: false,
      dataContent: null,
      dataMeta: {
        type: "unknown",
        description: "提取失败，当作纯文本",
        schema: {},
      },
    };
  }

  console.log(`✅ [InputProcessor] 处理完成:
  - 需求: ${result.requirement?.substring(0, 50)}...
  - 数据类型: ${result.dataMeta?.type}
  - 数据是否存在: ${result.isDataPresent}`);

  // 构造更新的状态
  const update: Partial<AmisAgentState> = {
    userRequirement: result.requirement,
  };

  if (result.isDataPresent && result.dataContent) {
    update.processData = {
      rawData:
        typeof result.dataContent === "string"
          ? result.dataContent
          : JSON.stringify(result.dataContent),
      dataStructure: result.dataContent,
      dataMeta: result.dataMeta || {
        type: "unknown",
        description: "",
        schema: {},
      },
    };
  }

  // 添加日志
  const event: ExecutionEvent = {
    type: "process_data", // 可以定义新的事件类型
    timestamp: new Date().toISOString(),
    message: "输入分析完成",
    data: {
      requirement: result.requirement,
      hasData: result.isDataPresent,
    },
  };

  update.executionLog = [...(state.executionLog || []), event];

  return update;
}
