/**
 * 文档索引器模块
 * 用于扫描、索引、搜索 amis 文档
 *
 * 功能：
 * - 递归扫描 docs 目录，提取文件、标题、frontmatter
 * - 基于关键词构建倒排索引
 * - 提供快速搜索能力（返回带锚点、摘要、示例的命中）
 * - 支持缓存与手动失效
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

// 获取当前模块所在目录
const __dirname = join(__filename, "..");

/**
 * 文档命中信息
 */
export interface DocHit {
  path: string;
  title?: string;
  summary?: string;
  anchors?: string[]; // 相关的标题锚点（H2/H3）
  codeExamples?: string[];
  score: number; // 相关性评分 (0-1)
}

/**
 * 索引项
 */
interface IndexEntry {
  path: string;
  title?: string;
  frontmatter?: Record<string, any>;
  content: string;
  headers: Array<{ level: number; text: string; id: string }>;
  codeExamples: string[];
}

/**
 * 倒排索引
 */
interface InvertedIndex {
  [keyword: string]: Array<{
    path: string;
    score: number;
    positions: ("title" | "header" | "content")[];
  }>;
}

/**
 * 文档索引器类
 */
export class DocsIndexer {
  private docsRoot: string;
  private entries: Map<string, IndexEntry> = new Map();
  private invertedIndex: InvertedIndex = {};
  private isReady: boolean = false;

  constructor(docsRoot?: string) {
    this.docsRoot = docsRoot || join(__dirname, ".", "docs");
  }

  /**
   * 构建索引
   */
  async build(): Promise<void> {
    console.log(`🔍 [DocsIndexer] 开始扫描文档: ${this.docsRoot}`);
    this.entries.clear();
    this.invertedIndex = {};

    // 递归扫描目录
    this.scanDirectory(this.docsRoot, "");

    // 构建倒排索引
    this.buildInvertedIndex();

    this.isReady = true;
    console.log(
      `✅ [DocsIndexer] 索引完成，共扫描 ${this.entries.size} 个文档`
    );
  }

  /**
   * 递归扫描目录
   */
  private scanDirectory(dir: string, relativePrefix: string): void {
    try {
      const files = readdirSync(dir);

      for (const file of files) {
        // 跳过隐藏文件与常见忽略目录
        if (file.startsWith(".") || file === "node_modules") continue;

        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        const relativePath = relativePrefix
          ? `${relativePrefix}/${file}`
          : file;

        if (stat.isDirectory()) {
          // 递归处理目录
          this.scanDirectory(fullPath, relativePath);
        } else if (file.endsWith(".md")) {
          // 读取并解析 Markdown 文件
          try {
            const content = readFileSync(fullPath, "utf-8");
            const entry = this.parseMarkdown(relativePath, content);
            this.entries.set(relativePath, entry);
          } catch (e) {
            console.warn(
              `⚠️ [DocsIndexer] 解析失败: ${relativePath}`,
              (e as Error).message
            );
          }
        }
      }
    } catch (e) {
      console.warn(
        `⚠️ [DocsIndexer] 扫描目录失败: ${dir}`,
        (e as Error).message
      );
    }
  }

  /**
   * 解析 Markdown 文件
   */
  private parseMarkdown(path: string, content: string): IndexEntry {
    // 提取 frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    let frontmatter: Record<string, any> = {};
    let markdownContent = content;

    if (frontmatterMatch) {
      markdownContent = content.slice(frontmatterMatch[0].length);
      // 简单解析 YAML frontmatter（仅提取 title 等字段）
      const fm = frontmatterMatch[1];
      const titleMatch = fm.match(/title:\s*(.+)/);
      if (titleMatch) {
        frontmatter.title = titleMatch[1].trim().replace(/["']/g, "");
      }
    }

    // 提取所有标题
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    let headerMatch;
    const headers: Array<{ level: number; text: string; id: string }> = [];
    while ((headerMatch = headerRegex.exec(markdownContent)) !== null) {
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, "-");
      headers.push({ level, text, id });
    }

    // 提取代码示例（schema 与 json 块）
    const codeExamples = this.extractCodeExamples(markdownContent);

    // 提取摘要（前 N 个非代码行）
    const summary = this.extractSummary(markdownContent);

    return {
      path,
      title: frontmatter.title || path.split("/").pop()?.replace(".md", ""),
      frontmatter,
      content: markdownContent,
      headers,
      codeExamples,
    };
  }

  /**
   * 提取代码示例
   */
  private extractCodeExamples(content: string): string[] {
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
   * 提取摘要
   */
  private extractSummary(content: string): string {
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
   * 构建倒排索引
   */
  private buildInvertedIndex(): void {
    const keywordMap = this.buildKeywordMap();

    for (const [path, entry] of this.entries) {
      const keywords = new Set<string>();

      // 从标题提取关键词
      if (entry.title) {
        this.tokenize(entry.title).forEach((kw) => keywords.add(kw));
      }

      // 从 frontmatter 提取关键词
      if (entry.frontmatter?.description) {
        this.tokenize(entry.frontmatter.description).forEach((kw) =>
          keywords.add(kw)
        );
      }

      // 从章节标题提取关键词
      entry.headers.forEach((h) => {
        this.tokenize(h.text).forEach((kw) => keywords.add(kw));
      });

      // 从文件路径提取关键词（如 form/input-text → form, input, text）
      this.tokenize(path).forEach((kw) => keywords.add(kw));

      // 根据关键词映射表扩展
      keywords.forEach((kw) => {
        if (keywordMap[kw]) {
          keywordMap[kw].forEach((mapped) => keywords.add(mapped));
        }
      });

      // 添加到倒排索引
      keywords.forEach((keyword) => {
        if (!this.invertedIndex[keyword]) {
          this.invertedIndex[keyword] = [];
        }

        // 计算相关性评分（初步估计）
        let score = 0;
        const positions: ("title" | "header" | "content")[] = [];

        if (entry.title?.toLowerCase().includes(keyword)) {
          score += 0.5;
          positions.push("title");
        }
        if (entry.headers.some((h) => h.text.toLowerCase().includes(keyword))) {
          score += 0.3;
          positions.push("header");
        }
        if (entry.content.toLowerCase().includes(keyword)) {
          score += 0.2;
          positions.push("content");
        }

        // 如果路径匹配度高，加权
        if (path.toLowerCase().includes(keyword)) {
          score += 0.3;
        }

        this.invertedIndex[keyword].push({
          path,
          score: Math.min(score, 1),
          positions,
        });
      });
    }

    // 排序每个关键词的命中结果
    Object.keys(this.invertedIndex).forEach((keyword) => {
      this.invertedIndex[keyword].sort((a, b) => b.score - a.score);
    });
  }

  /**
   * 构建关键词映射（同义词、别名）
   */
  private buildKeywordMap(): Record<string, string[]> {
    return {
      form: ["表单", "表单项"],
      input: ["输入", "输入框"],
      table: ["表格", "列表", "crud"],
      select: ["下拉", "选择器"],
      date: ["日期", "时间", "datetime"],
      upload: ["上传", "文件"],
      checkbox: ["复选", "多选"],
      radio: ["单选", "单选框"],
      button: ["按钮"],
      dialog: ["弹窗", "对话框"],
      drawer: ["抽屉"],
      page: ["页面"],
      api: ["接口", "数据", "请求"],
      schema: ["配置", "结构"],
      action: ["操作", "行为", "事件"],
      validation: ["验证", "校验"],
      style: ["样式", "主题"],
      responsive: ["响应式", "移动端"],
    };
  }

  /**
   * 文本分词（简单实现：中文逐字，英文按空格/符号）
   */
  private tokenize(text: string): string[] {
    const keywords = new Set<string>();

    // 英文 token 化（按空格、连字符等）
    const enTokens =
      text.toLowerCase().match(/\b[a-z0-9]+(-[a-z0-9]+)*\b/g) || [];
    enTokens.forEach((t) => keywords.add(t));

    // 中文逐字
    const cnTokens = text.match(/[\u4e00-\u9fa5]+/g) || [];
    cnTokens.forEach((cn) => {
      for (const char of cn) {
        keywords.add(char);
      }
    });

    return Array.from(keywords);
  }

  /**
   * 搜索文档
   */
  search(query: string, limit: number = 10): DocHit[] {
    if (!this.isReady) {
      console.warn("⚠️ [DocsIndexer] 索引未就绪，请先调用 build()");
      return [];
    }

    const keywords = this.tokenize(query);
    const hits = new Map<
      string,
      {
        score: number;
        anchors: Set<string>;
        positions: ("title" | "header" | "content")[];
      }
    >();

    // 合并多个关键词的搜索结果
    keywords.forEach((keyword) => {
      const results = this.invertedIndex[keyword] || [];

      results.slice(0, 20).forEach((result) => {
        if (!hits.has(result.path)) {
          hits.set(result.path, {
            score: 0,
            anchors: new Set(),
            positions: [],
          });
        }

        const hit = hits.get(result.path)!;
        hit.score += result.score;
        

        // 从 headers 中提取相关锚点
        const entry = this.entries.get(result.path);
        if (entry) {
          entry.headers.forEach((h) => {
            if (h.text.toLowerCase().includes(keyword)) {
              hit.anchors.add(h.id);
            }
          });
        }
      });
    });

    // 排序并转换为 DocHit 格式
    const results: DocHit[] = Array.from(hits.entries())
      .map(([path, hit]) => {
        const entry = this.entries.get(path)!;
        return {
          path,
          title: entry.title,
          summary: entry.content.slice(0, 300),
          anchors: Array.from(hit.anchors),
          codeExamples: entry.codeExamples.slice(0, 1),
          score: Math.min(hit.score / keywords.length, 1),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * 获取单个文档的完整内容
   */
  getDocContent(path: string): IndexEntry | null {
    return this.entries.get(path) || null;
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.entries.clear();
    this.invertedIndex = {};
    this.isReady = false;
  }
}

// 全局单例
let indexer: DocsIndexer | null = null;

/**
 * 获取全局索引器实例（延迟初始化）
 */
export function getIndexer(docsRoot?: string): DocsIndexer {
  if (!indexer) {
    indexer = new DocsIndexer(docsRoot);
  }
  return indexer;
}

/**
 * 初始化全局索引器
 */
export async function initializeIndexer(docsRoot?: string): Promise<void> {
  const idx = getIndexer(docsRoot);
  if (!idx["isReady"]) {
    await idx.build();
  }
}
