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
  let promptText = `你是一个 amis 配置任务规划专家。请分析用户需求，将其拆分为可执行的子任务。

用户需求：${userRequirement}`;

  if (processData) {
    promptText += `\n\n可用数据结构信息：
描述: ${processData.dataMeta?.description || "无"}
结构: ${JSON.stringify(processData.dataStructure, null, 2)},


你需要充分理解用户的需求，然后根据数据结构信息生成任务列表。
`;
  }

  if (isRetry) {
    promptText += `

🚨 注意：之前的任务执行失败了，请根据错误信息调整规划。
失败的任务：
${failedTasks
  .map((t) => `- 任务: ${t.description}\n  错误: ${t.errorMessage}`)
  .join("\n")}

请重新生成任务列表，尝试：
1. 将失败的复杂任务拆分为更简单的子任务
2. 修改任务描述，提供更明确的指导
3. 确保任务顺序逻辑正确`;
  }

  promptText += `
请生成任务列表，每个任务包含：
- id: 任务唯一标识（如 task-1, task-2）
- description: 任务描述（清晰说明要实现什么，包括数据绑定。任务必须是可执行的生成amis配置）
- type: 任务类型（如 form-item-input-text, form-item-select, form-assembly, crud-table 等）
- priority: 优先级（1=高，2=中，3=低）
- dataDependencies: 字符串数组，列出该任务需要使用的具体数据字段名
- status: 状态（固定为 "pending"）

要求：
1. 按照执行顺序排列任务
2. 最后一个任务应该是"组装"类型（如 form-assembly, page-assembly）
3. 任务描述要足够具体
4. 必须调用 generate_amis_tasks 工具来输出结果
5. 最多生成5个任务`;

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
    [PLAN_TASKS_TOOL],
    {
      parallel_tool_calls: false,
    }
  );

  let tasks: Task[] = [];
  let response;

  try {
    response = await modelWithTools.invoke([
      new SystemMessage({ content: systemPrompt }),
      new HumanMessage({ content: promptText }),
    ], config);

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
       const content = response.content as string;
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

  console.log(`✅ [Planner] 生成了 ${tasks.length} 个任务`);
  tasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.description} (${task.type})`);
  });

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
