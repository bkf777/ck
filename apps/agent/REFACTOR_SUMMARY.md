# 工作流改造完成总结

## 改造目标

将 amis Agent 工作流从简单的三节点线性流程升级为一个支持**动态文档检索、自动关联、失败回路、多轮规划**的健壮系统。

## 核心成果

### 1. 引入文档索引器（全量自动）✅

- **文件**: `apps/agent/src/docs-index.ts`（新增）
- **能力**:
  - 自动扫描整个 `apps/agent/docs` 目录
  - 构建倒排索引，支持中英文混合搜索
  - 相关性评分与排序
  - 提取代码示例与摘要
  - 内存缓存与可选持久化

### 2. 工作流架构升级（6 节点 + 路由）✅

**新流程**:

```
Planner (可复用规划)
   ↓
Docs Associate (自动检索文档)
   ↓
Context (提取上下文片段)
   ↓
Executor (注入文档，生成配置)
   ├→ 失败 → Planner (重新规划)
   ├→ 工具调用 → Tool Node → Executor (继续)
   └→ 成功 → Docs Associate (下一个任务)
   ↓
Composer (综合所有结果)
```

### 3. Task 模型扩展（精确文档追踪）✅

```typescript
Task {
  // 原有字段 ...

  // 新增：文档命中信息
  docHints?: {
    path: string;        // 相对路径
    anchors?: string[];  // 锚点
    score?: number;      // 相关性评分
    summary?: string;    // 摘要
  }[];

  // 预留：子任务支持
  subtasks?: Task[];
}
```

### 4. 执行流程改进（文档驱动）✅

- **移除硬编码**: 删除 `KEYWORD_MAPPING` 与手写的关键词映射
- **动态检索**: 文档关联由专用 AI Tool 节点负责
- **上下文注入**: Executor 自动获取最相关的 3 个文档片段并注入提示词
- **失败自救**: 失败任务自动回到 Planner 重新分析

### 5. 代码清理（移除冗余）✅

- 删除 `mapKeywordToDocPaths()`, `extractCodeExamples()`, `generateSummary()` 等硬编码函数
- 统一通过索引器处理文档操作
- Planner 提示词简化，不再预列文档路径

## 文件变更清单

| 文件                              | 类型    | 说明                                    |
| --------------------------------- | ------- | --------------------------------------- |
| `apps/agent/src/docs-index.ts`    | ✨ 新增 | 文档索引器模块                          |
| `apps/agent/src/amis-agent.ts`    | 🔄 改造 | 核心工作流，新增 2 节点，路由调整       |
| `apps/agent/src/smoke-test.ts`    | ✨ 新增 | 端到端冒烟测试脚本                      |
| `apps/agent/src/quick-start.ts`   | ✨ 新增 | 快速启动演示脚本                        |
| `apps/agent/package.json`         | 🔄 改造 | 新增 `test:smoke` 和 `quick-start` 脚本 |
| `apps/agent/WORKFLOW_REFACTOR.md` | ✨ 新增 | 改造详细说明文档                        |
| `apps/agent/QUICK_REFERENCE.md`   | ✨ 新增 | 快速参考指南                            |

## 关键设计决策

### 为什么分离 docs_associate 和 context 节点？

- **关注点分离**: docs_associate 负责检索，context 负责提取内容
- **可扩展性**: 未来可轻松添加缓存、过滤等逻辑

### 为什么失败任务回到 Planner？

- **自适应规划**: 让 AI 重新分析失败原因，可能调整拆解策略
- **容错能力**: 避免简单重试无法解决的问题

### 为什么用倒排索引而不是向量搜索？

- **轻量级**: 无需外部 AI 或向量库
- **快速冷启**: 构建速度快，适合频繁重建
- **易于调试**: 评分逻辑清晰可见

### 为什么保留 docPaths？

- **向后兼容**: 依赖 docPaths 的外部代码可继续工作
- **灵活性**: docPaths 由 docHints 的路径自动填充

## 验证方式

### 冒烟测试

```bash
pnpm test:smoke
```

验证端到端流程，包含：规划 → 文档关联 → 执行 → 综合

### 快速启动

```bash
pnpm quick-start
```

演示单轮执行，展示任务规划与文档关联结果

### 手动验证

```typescript
import { initializeAgent, graph } from "./amis-agent.js";
import { HumanMessage } from "@langchain/core/messages";

await initializeAgent();

const result = await graph.invoke({
  messages: [new HumanMessage({ content: "你的需求" })],
  userRequirement: "...",
  // ... 其他初始状态
});

console.log(result.tasks); // 查看规划结果
console.log(result.tasks[0].docHints); // 查看关联文档
```

## 后续可选优化

### 短期（易实现）

- [ ] 添加 LRU 缓存减少重复读文件
- [ ] 实现索引持久化（JSON 格式）
- [ ] 增加 CLI 工具管理索引（rebuild/clear）
- [ ] 更丰富的日志输出与调试模式

### 中期（需要依赖）

- [ ] 集成中文分词库（jieba.js）提升中文搜索质量
- [ ] 引入向量嵌入与余弦相似度评分
- [ ] 支持文档版本管理与切换
- [ ] 增量索引更新与文件监听

### 长期（架构升级）

- [ ] 支持自定义索引策略与权重配置
- [ ] 分布式索引与多源文档集成
- [ ] 学习用户的搜索反馈，动态优化权重
- [ ] 与知识图谱结合，支持语义搜索

## 重要提示

1. **首次运行前务必初始化**:

   ```typescript
   await initializeAgent(process.env.DOCS_ROOT);
   ```

2. **DOCS_ROOT 环境变量**:

   ```bash
   export DOCS_ROOT=apps/agent/docs  # Unix/Linux/macOS
   set DOCS_ROOT=apps/agent/docs     # Windows
   ```

3. **索引构建时间**:

   - 首次: 几秒钟（取决于文档数量）
   - 后续: 内存驻留，毫秒级搜索

4. **LLM 配置**:
   - 需要配置 Anthropic API
   - 可选：配置 OpenAI API（后续扩展）

## 变更对现有代码的影响

### ✅ 向后兼容

- `graph` 对象导出不变
- `AgentStateAnnotation` 导出不变
- 状态中的 `tasks` 和 `docPaths` 字段行为一致

### ⚠️ 需要注意

- Planner 提示词格式变化（移除文档路径列表）
- `retrieveDocumentation` 工具内部实现完全不同（但接口兼容）
- 新增 `initializeAgent()` 初始化函数

### ❌ 已删除

- `KEYWORD_MAPPING` 常量
- `mapKeywordToDocPaths()` 函数
- `extractCodeExamples()` 函数
- `generateSummary()` 函数
- （这些功能已迁移到 docs-index.ts 中的类方法）

## 下一步行动

1. **验证编译**: 确保没有 TypeScript 错误

   ```bash
   pnpm build  # 如果存在
   ```

2. **运行冒烟测试**: 验证工作流完整性

   ```bash
   pnpm test:smoke
   ```

3. **集成测试**: 在真实场景中测试（如果有）

4. **性能基准**: 测量索引构建与搜索耗时

5. **文档更新**: 将改造说明加入项目 README（可选）

---

**改造完成日期**: 2026-01-07
**改造范围**: amis Agent 工作流系统
**兼容性**: 向后兼容，新增功能无侵入
**测试覆盖**: 冒烟测试脚本 + 快速启动演示
