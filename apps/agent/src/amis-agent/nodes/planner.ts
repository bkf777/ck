import { RunnableConfig } from "@langchain/core/runnables";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { AmisAgentState } from "../state.js";
import { Task, ExecutionEvent } from "../types.js";

/**
 * 1. 任务规划节点 (Planner Node)
 * 职责：分析用户需求，生成结构化的子任务列表
 */
export async function planner_node(
  state: AmisAgentState,
  config: RunnableConfig
) {
  const userRequirement =
    state.userRequirement ||
    (state.messages[state.messages.length - 1] as HumanMessage).content;

  console.log(`\n📋 [Planner] 分析用户需求: ${userRequirement}`);

  // 定义模型
  const model = new ChatAnthropic({
    temperature: 0.3,
    model: "glm-4.7",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
  });

  // 构建提示词
  const prompt = `你是一个 amis 配置任务规划专家。请分析用户需求，将其拆分为可执行的子任务。

用户需求：${userRequirement}

请生成任务列表，每个任务包含：
- id: 任务唯一标识（如 task-1, task-2）
- description: 任务描述（清晰说明要实现什么）
- type: 任务类型（如 form-item-input-text, form-item-select, form-assembly, crud-table 等）
- priority: 优先级（1=高，2=中，3=低）
- docPaths: 留空数组（将在后续步骤由文档检索工具自动补全）
- status: 状态（固定为 "pending"）

要求：
1. 只返回 JSON 数组，不要有其他内容
2. 按照执行顺序排列任务
3. 最后一个任务应该是"组装"类型（如 form-assembly, page-assembly）以合成所有组件
4. 任务描述要足够具体，便于后续工具进行文档检索
5. 不要尝试预测或列举具体的文档路径，这会在后续步骤自动处理

请生成任务列表（JSON 数组格式）：`;

  // 调用 LLM
  const response = await model.invoke([
    new SystemMessage({ content: "你是 amis 配置任务规划专家" }),
    new HumanMessage({ content: prompt }),
  ]);

  // 解析响应
  let tasks: Task[] = [];
  try {
    const content = response.content as string;
    // 提取 ```json``` 代码块中的 JSON
    const jsonCodeBlockMatch = content.match(
      /```json[\s\S]*?\n([\s\S]*?)\n```/
    );
    if (jsonCodeBlockMatch) {
      tasks = JSON.parse(jsonCodeBlockMatch[1]);
    } else {
      // 如果没有代码块，尝试直接解析
      tasks = JSON.parse(content);
    }

    // 确保所有任务都有必需的字段
    tasks = tasks.map((task: any) => ({
      ...task,
      status: "pending",
      result: undefined,
      retryCount: 0,
    }));
  } catch (error) {
    console.error("任务列表解析失败:", error);
    // 返回默认任务列表
    const err = error as Error;
    tasks = [
      {
        id: "task-1",
        description: "分析需求并生成配置",
        type: "general",
        priority: 1,
        docPaths: ["docs/index.md"],
        status: "pending" as const,
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

  // 生成展示进度的工具调用消息
  const showStatusMsg = new AIMessage({
    content: "任务规划完成，开始执行...",
    tool_calls: [
      {
        id: `call_${Date.now()}_status`,
        name: "showExecutionStatus",
        args: {},
      },
    ],
  });

  return {
    tasks,
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [...(state.executionLog || []), event],
    userRequirement: userRequirement as string,
    contextDocuments: [],
    needsReplan: false,
    messages: [showStatusMsg],
  };
}
