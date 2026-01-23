// ============================================================
// 类型定义
// ============================================================

/**
 * 任务类型定义
 */
export type Task = {
  id: string;
  description: string;
  type: string;
  priority: number;
  docPaths: string[];
  status: "pending" | "in_progress" | "completed" | "failed" | "json_error";
  result?: any;
  rawResult?: string;
  retryCount?: number;
  errorMessage?: string;
  // 子任务列表（用于可复用 Planner 的二次拆解）
  subtasks?: Task[];
  // 文档命中信息（供上下文注入与证据链记录）
  docHints?: Array<{
    path: string;
    anchors?: string[];
    score?: number;
    summary?: string;
  }>;
};

/**
 * 执行事件类型（用于流式输出）
 */
export type ExecutionEvent = {
  type:
    | "task_start"
    | "doc_retrieval"
    | "docs_found"
    | "generating"
    | "generation_progress"
    | "task_complete"
    | "error"
    | "feedback";
  timestamp: string;
  taskId?: string;
  message?: string;
  data?: any;
};
