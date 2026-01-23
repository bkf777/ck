import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AmisAgentState } from "../state.js";
import { ExecutionEvent } from "../types.js";
import { getAllDocFiles, isAmisRelated } from "../utils.js";

/**
 * 1.5 文档关联节点 (Docs Associate Node)
 * 职责：一次性为所有任务检索并关联文档地址，避免重复检索
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

  console.log(
    `\n📚 [DocsAssociate] 开始为 ${tasks.length} 个任务批量检索文档...`,
  );

  try {
    // 动态读取文档列表
    const docsRoot = process.env.DOCS_ROOT || "src/docs";
    let allDocs: string[] = [];
    try {
      allDocs = getAllDocFiles(docsRoot);
    } catch (e) {
      console.warn("Failed to list docs:", e);
    }

    const model = new ChatAnthropic({
          temperature: 0.1,
          model: process.env.ANTHROPIC_MODEL || "glm-4.7",
          anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",      anthropicApiUrl: process.env.ANTHROPIC_API_URL || "",
    });

    // 批量处理所有任务，一次性为所有任务检索文档
    const updatedTasks = await Promise.all(
      tasks.map(async (task) => {
        const related = isAmisRelated(task);

        if (!related) {
          return task;
        }

        const prompt = `你是一个文档助手。请根据任务描述，从给定的文件列表中找出最相关的文档。

任务描述：${task.description}
任务类型：${task.type}

文件列表：
${allDocs.join("\n")}

请返回最相关的 1-3 个文件路径。
要求：
1. 只返回 JSON 字符串数组，不要包含 Markdown 格式或其他文字。
2. 必须精确匹配列表中的路径。
例如：["src/docs/components/form/input-text.md"]`;

        try {
          const response = await model.invoke([
            new SystemMessage({ content: "你是 amis 文档专家" }),
            new HumanMessage({ content: prompt }),
          ]);

          let selectedPaths: string[] = [];
          const content = response.content as string;

          // 多策略提取 JSON 数组
          let jsonString = content.trim();

          // 策略1: 提取代码块中的内容
          const codeBlockMatch = content.match(
            /```(?:json)?\s*(\[[\s\S]*?\])\s*```/,
          );
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
          } else {
            // 策略2: 提取方括号内容
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            }
          }

          try {
            selectedPaths = JSON.parse(jsonString);
          } catch (parseError) {
            // 如果解析失败，尝试清理后再解析
            jsonString = jsonString.replace(/,\s*\]/g, "]"); // 移除尾部多余逗号
            selectedPaths = JSON.parse(jsonString);
          }

          if (!Array.isArray(selectedPaths)) {
            selectedPaths = [];
          }

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
        } catch (e) {
          console.error(`文档检索失败 for task ${task.id}:`, e);
          return { ...task, docPaths: task.docPaths || [], docHints: [] };
        }
      }),
    );

    // 统计检索结果
    const totalDocs = updatedTasks.reduce(
      (sum, task) => sum + (task.docPaths?.length || 0),
      0,
    );

    const event: ExecutionEvent = {
      type: "docs_found",
      timestamp: new Date().toISOString(),
      message: `批量文档检索完成：为 ${updatedTasks.length} 个任务检索了 ${totalDocs} 篇文档`,
      data: { tasks: updatedTasks },
    };

    console.log(`✅ [DocsAssociate] 批量检索完成：${totalDocs} 篇文档`);

    return {
      tasks: updatedTasks,
      executionLog: [...(state.executionLog || []), event],
    };
  } catch (e) {
    const errEvent: ExecutionEvent = {
      type: "error",
      timestamp: new Date().toISOString(),
      message: `批量文档检索异常：${(e as Error).message}`,
    };
    return {
      executionLog: [...(state.executionLog || []), errEvent],
    };
  }
}
