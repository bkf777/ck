# 快速参考指南

## 工作流节点说明

### 1️⃣ Planner Node

- **输入**: 用户需求
- **输出**: 任务列表（未关联文档）
- **职责**: 将用户需求拆分为可执行的子任务
- **特点**: 完全可复用，无硬编码逻辑

### 2️⃣ Docs Associate Node

- **输入**: 当前任务
- **输出**: 任务 + 关联的文档地址与摘要
- **职责**: 调用文档检索工具，为任务寻找相关文档
- **决策**: 判断任务是否与 amis 相关，仅相关任务才检索

### 3️⃣ Context Node

- **输入**: 任务的文档地址列表
- **输出**: 上下文文档片段（摘要 + 代码示例）
- **职责**: 读取并解析关联文档，提取可注入到提示词的内容

### 4️⃣ Executor Node

- **输入**: 任务 + 上下文文档
- **输出**: 任务执行结果（amis JSON 配置）
- **职责**: 使用 LLM 生成配置，可能调用工具请求更多文档
- **失败路由**: 失败时返回 Planner 重新规划

### 5️⃣ Composer Node

- **输入**: 所有任务的执行结果
- **输出**: 最终的综合 amis JSON
- **职责**: 将所有组件组合成完整的页面配置

## 数据流

```
用户需求
    ↓
Planner: 任务列表
    ↓
Docs Associate: 任务 + 文档路径
    ↓
Context: 任务 + 文档片段
    ↓
Executor: 任务 + 执行结果
    ↓
Composer: 最终 JSON
```

## 关键接口

### Task 对象结构

```typescript
{
  id: string;                    // 任务 ID
  description: string;           // 任务描述
  type: string;                  // 任务类型（如 form, table, dialog）
  priority: number;              // 优先级（1-3）
  docPaths: string[];           // 文档路径数组
  docHints?: DocHint[];         // 文档命中信息（带评分）
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;                 // 执行结果
  errorMessage?: string;        // 错误信息
}
```

### DocHint 对象结构

```typescript
{
  path: string;          // 相对于 DOCS_ROOT 的文档路径
  anchors?: string[];    // 相关的标题锚点
  score?: number;        // 相关性评分 (0-1)
  summary?: string;      // 文档摘要
}
```

## 关键函数

### initializeAgent(docsRoot?)

初始化 Agent 并构建文档索引。

```typescript
import { initializeAgent } from "./amis-agent.js";

await initializeAgent(process.env.DOCS_ROOT);
```

### graph.invoke(state, config)

执行一步工作流。

```typescript
const result = await graph.invoke(initialState, {
  configurable: { thread_id: "my-thread" },
});
```

### getIndexer(docsRoot?)

获取全局文档索引器实例。

```typescript
import { getIndexer } from "./docs-index.js";

const indexer = getIndexer();
const hits = indexer.search("表单输入框", 10);
```

## 常见操作

### 1. 查询单个文档

```typescript
const indexer = getIndexer();
const entry = indexer.getDocContent("components/form/input-text.md");
console.log(entry?.title); // "输入框"
```

### 2. 搜索相关文档

```typescript
const indexer = getIndexer();
const hits = indexer.search("日期选择", 5);
hits.forEach((hit) => {
  console.log(`${hit.path} (评分: ${hit.score.toFixed(2)})`);
});
```

### 3. 清空并重建索引

```typescript
const indexer = getIndexer();
indexer.clear();
await initializeIndexer(newDocsRoot);
```

## 环境变量

| 变量                | 说明               | 默认值            |
| ------------------- | ------------------ | ----------------- |
| `DOCS_ROOT`         | 文档根目录路径     | `apps/agent/docs` |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | -                 |
| `ANTHROPIC_API_URL` | Anthropic API 地址 | -                 |

## 运行命令

```bash
# 冒烟测试（完整端到端流程）
pnpm test:smoke

# 快速启动（演示单轮执行）
pnpm quick-start

# 开发服务器
pnpm dev
```

## 故障排查

### 问题: 索引为空或文档找不到

**解决**: 检查 `DOCS_ROOT` 环境变量是否正确指向文档目录。

```bash
echo $DOCS_ROOT
# 应输出类似：apps/agent/docs
```

### 问题: "索引未就绪"警告

**解决**: 确保在调用 `graph.invoke()` 前先执行 `initializeAgent()`。

```typescript
// ❌ 错误
const result = await graph.invoke(...);

// ✅ 正确
await initializeAgent();
const result = await graph.invoke(...);
```

### 问题: 检索工具找不到相关文档

**解决**: 检查任务描述是否包含足够的关键词，或调整索引器的关键词映射表。

```typescript
// 调整 docs-index.ts 的 buildKeywordMap()
private buildKeywordMap(): Record<string, string[]> {
  return {
    "你的新关键词": ["别名1", "别名2"],
    // ...
  };
}
```

## 性能提示

1. **首次启动较慢**: 索引构建需要扫描整个文档目录，首次调用可能需要几秒钟。
2. **缓存驻留内存**: 索引构建后驻留在内存中，后续搜索非常快速。
3. **限制搜索结果**: 使用 `search(query, limit)` 的 `limit` 参数控制返回结果数量。

## 已知限制

1. **中文分词简化**: 目前采用逐字分词，没有使用成熟的中文分词库。
2. **索引全量构建**: 每次重启都需要全量扫描文档，不支持增量更新。
3. **缓存非持久**: 索引只驻留内存，重启后需重新构建。

## 后续改进

- [ ] 集成 jieba 或类似中文分词库
- [ ] 支持索引序列化与持久化
- [ ] 增量索引更新
- [ ] 文档变化监听
- [ ] 更高级的相关性评分算法
