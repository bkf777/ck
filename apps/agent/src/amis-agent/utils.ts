import { readdirSync, statSync } from "fs";
import { join } from "path";
import { Task } from "./types.js";

/**
 * 递归获取所有文档路径
 */
export function getAllDocFiles(dir: string, fileList: string[] = []): string[] {
  // 读取目录内容
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // 递归扫描子目录
      getAllDocFiles(filePath, fileList);
    } else if (file.endsWith(".md")) {
      // 收集 markdown 文件路径
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 简单判断任务是否与 amis 构建相关
export function isAmisRelated(task: Task): boolean {
  const text = `${task.type || ""} ${task.description || ""}`;
  const keys = [
    "amis",
    "form",
    "input",
    "select",
    "table",
    "crud",
    "page",
    "dialog",
    "drawer",
    "tabs",
    "wizard",
    "card",
    "button",
    "chart",
  ];
  return keys.some((k) => text.toLowerCase().includes(k));
}

/**
 * 提取 Markdown 中的代码示例（上下文注入时使用）
 */
export function extractCodeExamplesFromContent(content: string): string[] {
  const examples: string[] = [];

  // 提取 ```schema``` 或 ```json``` 块
  const codeRegex = /```(?:schema|json)\n([\s\S]*?)\n```/g;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (code) {
      examples.push(code);
    }
  }

  return examples;
}

/**
 * 生成文档摘要（上下文注入时使用）
 */
export function extractSummaryFromContent(content: string): string {
  const lines = content.split("\n");
  const summary: string[] = [];

  for (const line of lines) {
    // 跳过代码块
    if (line.startsWith("```")) continue;
    // 收集标题和前 10 行文本
    if (line.startsWith("#") || line.trim() !== "") {
      summary.push(line);
    }
    if (summary.length >= 10) break;
  }

  return summary.join("\n").trim().slice(0, 200);
}

/**
 * 从包含 Markdown 的字符串中提取并解析 JSON
 */
export function parseJsonFromMarkdown(content: string): any {
  if (!content) return null;
  if (typeof content !== "string") return content;
  let jsonString = content.trim();

  // 策略 1: 提取 ```json ... ``` 或 ``` ... ``` 块
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    // 策略 2: 寻找第一个 { 或 [ 到最后一个 } 或 ] 之间的内容
    const firstBrace = content.indexOf("{");
    const firstBracket = content.indexOf("[");
    const start =
      firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
        ? firstBrace
        : firstBracket;

    const lastBrace = content.lastIndexOf("}");
    const lastBracket = content.lastIndexOf("]");
    const end = lastBrace > lastBracket ? lastBrace : lastBracket;

    if (start !== -1 && end !== -1 && end > start) {
      jsonString = content.substring(start, end + 1);
    }
  }

  // 清理常见的非法字符（如某些模型可能带出的零宽字符或注释）
  jsonString = jsonString
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "") // 移除注释
    .trim();

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // 策略 3: 尝试修复常见 JSON 错误（如尾部逗号）并再次解析
    try {
      const fixedJson = jsonString
        .replace(/,\s*([}\]])/g, "$1") // 移除尾部逗号
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":'); // 确保键名有双引号
      return JSON.parse(fixedJson);
    } catch (innerE) {
      console.error("JSON 提取解析失败。原始内容:", content);
      throw innerE;
    }
  }
}
