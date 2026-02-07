import { RunnableConfig } from "@langchain/core/runnables";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import { getAllDocFiles, isAmisRelated } from "../utils.js";

/**
 * 1.5 文档关联节点 (Docs Associate Node) - 启发式匹配版
 * 职责：通过关键词匹配为任务关联文档，完全避免 LLM 调用以节省 RPM。
 */
export async function docs_associate_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  const tasks = state.tasks || [];

  // 如果已经处理过文档关联，跳过
  if (tasks.length > 0 && tasks[0].docHints && tasks[0].docHints!.length > 0) {
    console.log("✅ [DocsAssociate] 文档已关联，跳过重复检索");
    return {};
  }

  const targetTasks = tasks.filter(task => isAmisRelated(task));
  if (targetTasks.length === 0) {
    return { tasks };
  }

  console.log(`\n📚 [DocsAssociate] 开始为 ${targetTasks.length} 个任务进行启发式文档检索...`);

  try {
    const docsRoot = process.env.DOCS_ROOT || "src/docs";
    let allDocs: string[] = [];
    try {
      allDocs = getAllDocFiles(docsRoot);
    } catch (e) {
      console.warn("Failed to list docs:", e);
    }

    const updatedTasks = tasks.map(task => {
      if (!isAmisRelated(task)) return task;

      // 提取任务描述和类型中的关键词
      const searchStr = `${task.description} ${task.type}`.toLowerCase();
      
      // 简单的启发式匹配算法
      const matches = allDocs
        .map(docPath => {
          const fileName = docPath.toLowerCase();
          let score = 0;
          
          // 1. 类型匹配 (权重最高)
          if (task.type && fileName.includes(task.type.toLowerCase())) score += 10;
          
          // 2. 关键词匹配
          const keywords = ["form", "table", "chart", "crud", "list", "card", "tabs", "input", "select", "dialog"];
          
          // 如果有数据依赖，增加数据处理相关的文档权重
          if (task.dataDependencies && task.dataDependencies.length > 0) {
             keywords.push("tpl", "formula", "mapping", "service");
          }

          keywords.forEach(kw => {
            if (searchStr.includes(kw) && fileName.includes(kw)) score += 5;
          });

          // 3. 路径包含匹配
          const parts = task.description.toLowerCase().split(/[型：\s,，]/);
          parts.forEach(part => {
            if (part.length > 1 && fileName.includes(part)) score += 2;
          });

          return { path: docPath, score };
        })
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const selectedPaths = matches.map(m => m.path);

      return {
        ...task,
        docPaths: selectedPaths,
        docHints: selectedPaths.map((path) => ({
          path,
          anchors: undefined,
          score: undefined,
          summary: undefined,
        })),
      };
    });

    const totalDocs = updatedTasks.reduce((sum, t) => sum + (t.docPaths?.length || 0), 0);

    const event: ExecutionEvent = {
      type: "docs_found",
      timestamp: new Date().toISOString(),
      message: `启发式文档检索完成：关联了 ${totalDocs} 篇文档 (0 RPM 消耗)`,
    };

    console.log(`✅ [DocsAssociate] 检索完成：${totalDocs} 篇文档 (已禁用 AI 以节省 RPM)`);

    return {
      tasks: updatedTasks,
      executionLog: [...(state.executionLog || []), event],
    };
  } catch (e) {
    return {
      tasks, // 👈 必须包含，否则前端会丢失任务列表
      executionLog: [...(state.executionLog || []), {
        type: "error",
        timestamp: new Date().toISOString(),
        message: `文档检索异常: ${(e as Error).message}`
      }],
    };
  }
}
