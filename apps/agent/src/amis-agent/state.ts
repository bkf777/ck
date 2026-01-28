import { Annotation,MessagesAnnotation } from "@langchain/langgraph";

import { Task, ExecutionEvent } from "./types.js";

// ============================================================
// 状态定义
// ============================================================

export const AgentStateAnnotation = Annotation.Root({
  // CopilotKit 基础状态（包含 messages 和 actions）
  ...MessagesAnnotation.spec,

  // 用户原始需求
  userRequirement: Annotation<string>,

  // 任务列表
  tasks: Annotation<Task[]>,

  // 当前执行的任务索引
  currentTaskIndex: Annotation<number>,

  // 最终生成的 amis JSON
  schema: Annotation<object>,

  // 执行日志（用于流式输出）
  executionLog: Annotation<ExecutionEvent[]>,

  // 用户反馈状态
  feedbackStatus: Annotation<"pending" | "approved" | "modify" | "regenerate">,

  // 需要重新执行的任务索引
  tasksToRetry: Annotation<number[]>,

  // 流式输出累积内容
  streamedContent: Annotation<string>,

  // 错误信息
  error: Annotation<string | null>,

  // 为当前任务准备的上下文文档片段（由 docs/context 节点产出）
  contextDocuments: Annotation<
    Array<{
      path: string;
      summary?: string;
      codeExamples?: string[];
      anchors?: string[];
      content?: string;
      score?: number;
    }>
  >,

  // 需要回到规划节点重新规划
  needsReplan: Annotation<boolean>,

  // 处理后的数据（由 input_processor 提取）
  processData: Annotation<{
    rawData: string; // 原始数据内容
    dataStructure: any; // 结构化数据
    dataMeta: {
      // 数据元信息
      description: string;
      schema: object;
      type: string;
    };
  }>,

  // A/B 测试分组 (A: 对照组-旧流程, B: 实验组-新流程)
  abTestGroup: Annotation<"A" | "B">,
});

export type AmisAgentState = typeof AgentStateAnnotation.State;
