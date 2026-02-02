import { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { createChatModel } from "../../utils/model-factory.js";
import { AmisAgentState } from "../state.js";
import { Task, ExecutionEvent } from "../types.js";
import { getMessageContentText } from "../utils.js";

// Define the tool for generating tasks
const PLAN_TASKS_TOOL = {
  type: "function",
  function: {
    name: "generate_amis_tasks",
    description: "Generate a list of tasks to build the AMIS page implementation based on requirements.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique task ID (e.g., task-1)" },
              description: { type: "string", description: "Clear description of what to implement" },
              type: { 
                type: "string", 
                description: "Task type (e.g., form-item-input-text, form-item-select, form-assembly, crud-table, etc.)" 
              },
              priority: { type: "number", description: "Priority: 1=High, 2=Medium, 3=Low" },
              dataDependencies: { 
                type: "array", 
                items: { type: "string" }, 
                description: "List specific data fields this task uses (if any)" 
              },
              status: { 
                type: "string", 
                enum: ["pending"], 
                description: "Initial status, must be 'pending'" 
              }
            },
            required: ["id", "description", "type", "priority", "status"]
          },
          description: "List of structured tasks"
        }
      },
      required: ["tasks"]
    }
  }
};

/**
 * 1. 任务规划节点 (Planner Node)
 * 职责：分析用户需求，生成结构化的子任务列表
 */
export async function planner_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  const userRequirement =
    state.userRequirement ||
    (state.messages[state.messages.length - 1] as HumanMessage).content;

  const processData = state.processData;

  // 检查是否有失败的任务导致的回退
  const failedTasks = (state.tasks || []).filter((t) => t.status === "failed");
  const isRetry = failedTasks.length > 0;

  console.log(
    `\n📋 [Planner] 分析用户需求: ${
      isRetry ? `(重试模式: ${failedTasks.length} 个任务失败)` : ""
    }`,
  );

  // 定义模型
  const model = createChatModel({
    temperature: 0.3,
  });

  // 构建提示词
  let promptText = `你是一个 amis 配置任务规划专家。请分析用户需求，将其拆分为 1-3 个核心任务。
你的目标是生成 "Coarse-grained" (粗粒度) 的任务，确保 Executor 可以一次性生成完整的组件块（如整个表单、整个列表），而不是零散的字段。

用户需求：${userRequirement}`;

  if (processData) {
    promptText += `\n\n可用数据结构信息：
描述: ${processData.dataMeta?.description || "无"}
结构: ${JSON.stringify(processData.dataStructure, null, 2)}
`;
  }

  // 注入文档索引以辅助类型选择
  promptText += `\n\n【Amis 组件类型索引】(必需严格遵守)
请为每个任务指定准确的组件 type（必须是以下列表中的有效值）：

1. 页面/容器类
   - page (页面根节点)
   - service (数据服务/Mock数据容器)
   - form (表单容器)
   - wizard (向导)
   - dialog (弹窗)
   - drawer (抽屉)
   - wrapper (简单容器)

2. 数据展示类
   - table (静态表格)
   - crud (增删改查高级列表)
   - cards (卡片列表)
   - list (普通列表)
   - chart (图表)
   - tpl (HTML/文本模板)
   - json (JSON展示)
   - image (图片)
   - video (视频)
   - audio (音频)

3. 布局类
   - flex (Flex布局)
   - grid (网格布局)
   - hbox (水平布局)
   - container (通用容器)
   - divider (分割线)

4. 功能类
   - action (通用动作/按钮)
   - button (按钮)
   - button-group (按钮组)
   - tasks (异步任务)
   - nav (导航)

⚠️ 注意：
1. **Type 准确性**：必须使用上述英文 type 字符串，严禁臆造（如不要用 'user-list'，应使用 'crud' 或 'table'）。
2. **数据源原则**：除非用户明确要求 "从接口获取"、"连接后端" 或 "API"，否则**默认使用静态数据**。不要配置 API 地址，而是将 Mock 数据直接写入配置。
3. **任务聚合**：尽量聚合任务！例如用户需要一个"包含姓名、年龄的查询表单"，请生成一个 type="form" 的任务，描述中包含所有字段要求，而不是生成两个 type="input-text" 的任务。
`;

  if (isRetry) {
    promptText += `
\n🚨 注意：之前的任务执行失败了，请根据错误信息调整规划。
失败的任务：
${failedTasks
  .map((t) => `- 任务: ${t.description}\n  错误: ${t.errorMessage}`)
  .join("\n")}

策略调整：
1. 如果是因为任务过于复杂导致失败，尝试适当拆分，但不要拆得太细。
2. 检查描述是否缺少关键信息（如数据绑定路径）。
`;
  }

  promptText += `
请生成任务列表，每个任务包含：
- id: 任务唯一标识（如 task-1）
- description: 详细的任务描述。
  - 对于表单/列表：列出所有需要的字段、按钮和交互逻辑。
  - 包含数据绑定要求（如 "使用 \${rows} 作为数据源"）。
  - 必须包含"做什么"和"怎么做"的上下文。
- type: 核心组件类型（见上文索引，如 form, crud, page, chart 等）。不要使用 form-item-xxx 这种细粒度类型，除非它是独立的。
- priority: 优先级
- dataDependencies: 需要的数据字段
- status: "pending"

关键规则：
1. **少即是多**：通常 1-2 个任务足以描述一个页面区域（例如：一个任务负责"查询表单"，一个任务负责"数据列表"）。
2. **完整性**：任务描述必须包含 Executor 生成该组件所需的所有信息（字段名、标签、类型、API 绑定等）。
3. **协作性**：如果有多个任务，确保描述中提及它们的关系（例如 "位于查询表单下方"）。
4. **组装**：如果涉及复杂布局，最后一个任务可以是 "page-assembly" (组装)。
5. 必须调用 generate_amis_tasks 工具。`;

  const systemPrompt = "你是一个 amis 页面设计专家，负责将用户需求拆解为具体的实施任务。你必须调用 generate_amis_tasks 工具。";

  // Use "predict_state" metadata to set up streaming for the tool
  if (!config.metadata) config.metadata = {};
  config.metadata.predict_state = [{
    state_key: "tasks",
    tool: "generate_amis_tasks",
    tool_argument: "tasks",
  }];

  // Bind the tools to the model
  const modelWithTools = model.bindTools(
    [PLAN_TASKS_TOOL]
  );

  let tasks: Task[] = [];
  let response;

  try {
    response = await modelWithTools.invoke([
      new SystemMessage({ content: systemPrompt }),
      new HumanMessage({ content: promptText }),
    ]);

    // Extract tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls.find(tc => tc.name === "generate_amis_tasks");
      if (toolCall) {
        tasks = toolCall.args.tasks.map((t: any) => ({
          ...t,
          docPaths: [], // Initialize docPaths as empty
          status: "pending",
          retryCount: 0
        }));
      }
    } else {
       // Fallback: parse raw content if model didn't use tool (shouldn't happen with force bind, but safe to keep)
       console.warn("[Planner] Model did not call tool, attempting fallback parse...");
       const content = getMessageContentText(response.content);
        const jsonCodeBlockMatch = content.match(
          /```json[\s\S]*?\n([\s\S]*?)\n```/,
        );
        if (jsonCodeBlockMatch) {
          tasks = JSON.parse(jsonCodeBlockMatch[1]);
        } else {
             // Try strict parse if just JSON
            try {
                 tasks = JSON.parse(content);
            } catch(e) {
                // If it's a list inside key 'tasks'
                try {
                     const parsed = JSON.parse(content);
                     if(parsed.tasks && Array.isArray(parsed.tasks)) tasks = parsed.tasks;
                } catch(ign) {}
            }
        }
        
        // Normalize
        tasks = tasks.map((task: any) => ({
          ...task,
          status: "pending",
          result: undefined,
          retryCount: 0,
          docPaths: task.docPaths || [],
        }));
    }

  } catch (e) {
    console.error(
      "FATAL: Planner LLM call failed.",
      e,
    );
     tasks = [
      {
        id: "task-error",
        description: "任务规划失败: " + ((e as any).message || "Unknown error"),
        type: "general",
        priority: 1,
        docPaths: [],
        status: "failed",
      },
    ];
  }

  if (tasks.length === 0) {
      // Emergency backup
       tasks = [
      {
        id: "task-1",
        description: "分析需求并生成配置 (Fallback)",
        type: "general",
        priority: 1,
        docPaths: [],
        status: "pending",
      },
    ];
  }


  // 添加执行日志
  const event: ExecutionEvent = {
    type: "task_start",
    timestamp: new Date().toISOString(),
    message: `任务规划完成，共生成 ${tasks.length} 个子任务`,
    data: { tasks },
  };

  // IMPORTANT: Manually emit state update for frontend to sync immediately
  // This matches the user's "correct code example" pattern
  await dispatchCustomEvent(
    "manually_emit_state", 
    {
      ...state,
      tasks,
      executionLog: [...(state.executionLog || []), event]
    }, 
    config
  );

  return {
    tasks,
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [...(state.executionLog || []), event],
    userRequirement: userRequirement as string,
    contextDocuments: [],
    needsReplan: false,
  };
}
