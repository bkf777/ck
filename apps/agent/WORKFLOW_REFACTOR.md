# amis Agent 工作流改造说明

## 概述

该改造将原有的简化工作流升级为一个更加健壮、灵活的任务规划与执行系统，引入了**文档索引器**和**专用节点**来自动关联与注入文档上下文。

## 核心改动点

### 1. 工作流架构变更

**原流程** (3 个节点):

```
START → Planner → Executor → Composer → END
```

**新流程** (6 个节点，支持回路):

```
START
  ↓
Planner (可复用任务规划)
  ↓
Docs Associate (自动检索文档，绑定到任务)
  ↓
Context (读取文档内容，提取上下文)
  ↓
Executor (注入文档片段，生成配置)
  ├→ Tool Node (调用文档检索工具)
  ├→ Planner (失败时重新规划)
  └→ Docs Associate (继续下一个任务)
  ↓
Composer (所有任务完成，综合输出)
  ↓
END
```

### 2. 新增文档索引器模块

**文件**: `apps/agent/src/docs-index.ts`

核心功能：

- **全量扫描**: 递归扫描 `DOCS_ROOT`（默认 `apps/agent/docs`），解析 Markdown 文件
- **倒排索引**: 构建关键词到文件的映射，支持中文分词与英文 tokenization
- **智能搜索**: 返回带锚点、摘要、代码示例、相关性评分的命中结果
- **缓存机制**: 索引驻留内存，支持手动失效与重建

关键类/函数：

- `DocsIndexer` 类：索引器主类
- `getIndexer(docsRoot?)`: 获取全局单例
- `initializeIndexer(docsRoot?)`: 异步初始化索引

### 3. Task 类型扩展

新增两个属性用于存储文档关联信息：

```typescript
export type Task = {
  // ... 原有字段 ...

  // 子任务列表（为复用 Planner 的多轮拆解预留）
  subtasks?: Task[];

  // 文档命中信息（由 docs_associate 节点填充）
  docHints?: Array<{
    path: string;
    anchors?: string[];
    score?: number;
    summary?: string;
  }>;
};
```

### 4. 状态扩展

新增两个状态用于支持新节点与路由：

```typescript
contextDocuments: Annotation<Array<{ /* 文档片段信息 */ }>>,
needsReplan: Annotation<boolean>,  // 标记是否需要回到 Planner
```

### 5. 新增节点

#### docs_associate_node

**职责**: 判断任务是否与 amis 相关，调用文档检索工具补全任务的文档地址。

- 输入: 当前任务索引与任务信息
- 输出: 更新任务的 `docHints` 与 `docPaths`
- 工具调用: `retrieveDocumentation`（AI Tool）

#### context_node

**职责**: 读取已关联的文档，提取摘要与代码示例，准备上下文供执行器使用。

- 输入: 任务的 `docHints`
- 输出: 填充 `contextDocuments` 状态
- 操作: 逐项读取文件、解析内容

### 6. 工具升级

#### retrieveDocumentation

- **原逻辑**: 依赖硬编码关键词映射表（`KEYWORD_MAPPING`）
- **新逻辑**: 调用索引器的 `search()` 方法，返回前 N 个高相关性命中
- **返回格式**:
  ```typescript
  {
    success: boolean,
    docPaths: string[],
    documents: Array<{
      path: string,
      title?: string,
      summary?: string,
      anchors?: string[],
      codeExamples?: string[],
      score: number,
    }>,
    count: number,
  }
  ```

### 7. Planner 提示词简化

移除了硬编码的文档路径清单，改为告诉模型"不要尝试预测文档路径，这会在后续自动处理"。

### 8. 路由与失败处理

- **成功路径**: executor → docs_associate（下一个任务）
- **工具调用**: executor → tool_node → executor
- **失败回环**: executor (status=failed) → planner（复盘与重拆）
- **完成**: 所有任务都完成 → composer

### 9. 执行提示词注入

Executor 的生成提示中自动注入前 3 个最相关的文档片段：

```
以下是与本任务相关的文档摘录（供参考）：
【文档1】docs/components/form/input-text.md
摘要：...
示例：...

【文档2】...
...
```

## 配置

### 环境变量

- `DOCS_ROOT`: 文档根目录路径（默认: `apps/agent/docs`）

### 模型配置

需要设置以下环境变量以使用具体的 LLM 提供商：

- Anthropic API:
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_API_URL` (可选)

## 初始化与运行

### 初始化 Agent

```typescript
import { initializeAgent } from "./amis-agent.js";

// 在启动 Agent 前初始化（构建文档索引）
await initializeAgent(process.env.DOCS_ROOT);
```

### 冒烟测试

```bash
pnpm test:smoke
```

运行端到端冒烟测试，验证从规划 → 文档关联 → 执行 → 综合的完整链路。

## 核心优势

1. **文档驱动**: 不再依赖提示词中硬编码的文档清单，而是动态索引全量文档。
2. **可复用规划器**: Planner 独立且可配置，支持多轮规划与重规划。
3. **自动关联**: 任务与文档的绑定完全自动化，避免人工维护映射表。
4. **透明执行**: 每个任务的文档来源、相关性评分清晰可见，便于调试与改进。
5. **容错机制**: 失败任务自动回到规划阶段重新分析，不会陷入死循环。

## 扩展点

### 添加新文档类型

索引器会自动扫描 `DOCS_ROOT` 下所有 `.md` 文件，无需配置。

### 自定义相关性评分

修改 `docs-index.ts` 中 `buildInvertedIndex()` 与 `buildKeywordMap()` 方法以调整权重。

### 修改文档搜索策略

调整 `searchDocs()` 的 `limit` 参数与返回结果的排序逻辑。

### 自定义上下文注入

修改 `context_node` 和 `executor_node` 中的摘要与代码示例拼接逻辑。

## 文件清单

| 文件                           | 说明                     |
| ------------------------------ | ------------------------ |
| `apps/agent/src/docs-index.ts` | 文档索引器模块（新增）   |
| `apps/agent/src/amis-agent.ts` | 主工作流文件（大幅改造） |
| `apps/agent/src/smoke-test.ts` | 冒烟测试脚本（新增）     |
| `apps/agent/package.json`      | 新增 `test:smoke` 脚本   |

## 后续改进方向

1. **打分算法优化**: 引入更复杂的相关性评分（BM25、TF-IDF 等）。
2. **增量索引**: 支持监听文档变化，增量更新索引而不是全量重建。
3. **缓存持久化**: 将索引序列化到磁盘，加快冷启动。
4. **多语言支持**: 增强中文分词库，支持更多语言。
5. **文档版本管理**: 支持不同版本文档的切换与对比。
6. **用户反馈循环**: 记录查询与命中文档的映射，优化索引权重。
