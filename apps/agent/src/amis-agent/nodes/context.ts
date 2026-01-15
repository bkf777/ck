import { RunnableConfig } from "@langchain/core/runnables";
import { readFileSync, existsSync } from "fs";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import {
  extractSummaryFromContent,
  extractCodeExamplesFromContent,
} from "../utils.js";

/**
 * 2.5 上下文注入节点 (Context Node)
 * 职责：将与任务相关的文档内容（摘要/示例）准备好注入到执行提示词
 */
export async function context_node(
  state: AmisAgentState,
  config: RunnableConfig
) {
  const currentIndex = state.currentTaskIndex || 0;
  const tasks = state.tasks || [];
  if (currentIndex >= tasks.length) {
    return { contextDocuments: [] };
  }

  const task = tasks[currentIndex];
  const hints = task.docHints || [];
  const docs: Array<{
    path: string;
    summary?: string;
    codeExamples?: string[];
    anchors?: string[];
    content?: string;
    score?: number;
  }> = [];

  for (const h of hints.slice(0, 5)) {
    try {
      if (existsSync(h.path)) {
        const content = readFileSync(h.path, "utf-8");
        docs.push({
          path: h.path,
          summary: h.summary || extractSummaryFromContent(content),
          codeExamples: extractCodeExamplesFromContent(content),
          anchors: h.anchors,
          content,
          score: h.score,
        });
      }
    } catch {
      // 忽略单个文件的读取错误
    }
  }

  const event: ExecutionEvent = {
    type: "generating",
    timestamp: new Date().toISOString(),
    taskId: task.id,
    message: docs.length
      ? `已准备 ${docs.length} 个上下文文档片段`
      : "未找到可用上下文文档，继续执行",
  };

  return {
    contextDocuments: docs,
    executionLog: [...(state.executionLog || []), event],
  };
}
