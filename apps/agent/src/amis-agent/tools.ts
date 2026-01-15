import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getIndexer, initializeIndexer } from "../docs-index.js";

// ============================================================
// 文档检索工具
// ============================================================

/**
 * 文档检索工具（使用全量索引）
 */
export const retrieveDocumentation = tool(
  async (args) => {
    const { query, taskType } = args;

    try {
      // 确保索引已初始化
      await initializeIndexer(process.env.DOCS_ROOT);
      const indexer = getIndexer(process.env.DOCS_ROOT);

      // 调用索引搜索
      const hits = indexer.search(query, 10);

      if (hits.length === 0) {
        return {
          success: false,
          error: `未找到相关文档: ${query}`,
          documents: [],
          docPaths: [],
        };
      }

      // 转换为返回格式
      const documents = hits.map((hit) => ({
        path: hit.path,
        title: hit.title,
        summary: hit.summary,
        anchors: hit.anchors,
        codeExamples: hit.codeExamples,
        score: hit.score,
      }));

      const docPaths = documents.map((d) => d.path);

      return {
        success: true,
        docPaths,
        documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `文档检索失败: ${(error as Error).message}`,
        documents: [],
        docPaths: [],
      };
    }
  },
  {
    name: "retrieveDocumentation",
    description: "根据查询和任务类型检索 amis 相关文档（使用全量索引）",
    schema: z.object({
      query: z.string().describe("查询关键词或描述"),
      taskType: z.string().describe("任务类型（可选）"),
    }),
  }
);

// ============================================================
// 工具集合
// ============================================================

export const tools = [retrieveDocumentation];

/**
 * 初始化 Agent（包括索引器构建）
 */
export async function initializeAgent(docsRoot?: string): Promise<void> {
  console.log("🚀 [Agent] 初始化开始...");
  try {
    await initializeIndexer(docsRoot);
    console.log("✅ [Agent] 初始化完成");
  } catch (error) {
    console.error("❌ [Agent] 初始化失败:", (error as Error).message);
    throw error;
  }
}
