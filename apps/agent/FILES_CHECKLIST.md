# 改造文件清单 & 快速导航

## 📋 核心文件

### 新增文件

1. **📄 docs-index.ts** - 文档索引器

   - 路径: `apps/agent/src/docs-index.ts`
   - 功能: 全量文档扫描、倒排索引、智能搜索
   - 关键导出: `DocsIndexer`, `getIndexer()`, `initializeIndexer()`
   - 代码量: ~450 行

2. **🧪 smoke-test.ts** - 冒烟测试脚本

   - 路径: `apps/agent/src/smoke-test.ts`
   - 功能: 端到端流程验证
   - 命令: `pnpm test:smoke`
   - 特点: 完整展示规划 → 关联 → 执行 → 综合全链路

3. **🚀 quick-start.ts** - 快速启动脚本

   - 路径: `apps/agent/src/quick-start.ts`
   - 功能: 演示单轮工作流执行
   - 命令: `pnpm quick-start`
   - 用途: 学习 API 和调试

4. **📖 WORKFLOW_REFACTOR.md** - 改造详细文档

   - 路径: `apps/agent/WORKFLOW_REFACTOR.md`
   - 内容: 完整的改造说明、设计决策、扩展指南

5. **📖 QUICK_REFERENCE.md** - 快速参考

   - 路径: `apps/agent/QUICK_REFERENCE.md`
   - 内容: 节点说明、API 文档、常见操作示例

6. **📖 REFACTOR_SUMMARY.md** - 改造总结（本文件）
   - 路径: `apps/agent/REFACTOR_SUMMARY.md`
   - 内容: 核心成果、文件清单、后续方向

### 改造文件

1. **⚙️ amis-agent.ts** - 核心工作流

   - 路径: `apps/agent/src/amis-agent.ts`
   - 改动:
     - 新增 2 个节点: `docs_associate_node`, `context_node`
     - 新增 1 个初始化函数: `initializeAgent()`
     - 新增辅助函数: `isAmisRelated()`, `extractCodeExamplesFromContent()`, `extractSummaryFromContent()`
     - 升级工具: `retrieveDocumentation` 现在使用索引器
     - 更新路由逻辑：支持失败回到 Planner
     - 简化 Planner 提示词
     - 扩展 Task 类型：新增 `subtasks`, `docHints`
     - 扩展状态：新增 `contextDocuments`, `needsReplan`
   - 代码量: 改造比例 ~40%（新增节点、路由、类型）

2. **📦 package.json** - 脚本配置
   - 路径: `apps/agent/package.json`
   - 新增脚本:
     - `pnpm test:smoke` - 冒烟测试
     - `pnpm quick-start` - 快速启动

## 🔍 详细改动说明

### amis-agent.ts 改动详情

#### 新增导入

```typescript
import { getIndexer, initializeIndexer, type DocHit } from "./docs-index.js";
```

#### 新增/删除函数

| 函数                               | 状态    | 说明                         |
| ---------------------------------- | ------- | ---------------------------- |
| `KEYWORD_MAPPING` 常量             | ❌ 删除 | 由索引器动态生成             |
| `mapKeywordToDocPaths()`           | ❌ 删除 | 由索引器 `search()` 替代     |
| `extractCodeExamples()`            | ❌ 删除 | 迁移到索引器，命名为内部方法 |
| `generateSummary()`                | ❌ 删除 | 迁移到索引器，命名为内部方法 |
| `initializeAgent()`                | ✅ 新增 | Agent 初始化函数             |
| `docs_associate_node()`            | ✅ 新增 | 文档关联节点                 |
| `context_node()`                   | ✅ 新增 | 上下文注入节点               |
| `isAmisRelated()`                  | ✅ 新增 | 任务相关性判断               |
| `extractCodeExamplesFromContent()` | ✅ 新增 | 本地工具函数                 |
| `extractSummaryFromContent()`      | ✅ 新增 | 本地工具函数                 |

#### 工作流图改动

```typescript
// 原流程
START → planner → executor → composer → END

// 新流程
START → planner → docs_associate → context → executor → {
  tool_node,
  planner (失败时),
  docs_associate (下一个)
} → composer → END
```

#### 状态扩展

新增两个状态字段:

- `contextDocuments: Annotation<DocContext[]>`
- `needsReplan: Annotation<boolean>`

## 🚀 快速开始步骤

### 1. 安装依赖（如果需要）

```bash
cd apps/agent
pnpm install
```

### 2. 运行冒烟测试

```bash
pnpm test:smoke
```

### 3. 查看日志输出

观察输出中的：

- 📋 任务规划阶段
- 📚 文档检索阶段
- ⚙️ 任务执行阶段
- 🎼 结果综合阶段

## 📊 代码统计

| 指标         | 数值    |
| ------------ | ------- |
| 新增代码行数 | ~800 行 |
| 删除代码行数 | ~100 行 |
| 新增文件     | 6 个    |
| 改造文件     | 2 个    |
| 新增节点     | 2 个    |
| 新增导出     | 4 个    |

## 🔗 文件关系图

```
docs-index.ts
    ↑
    │ (导入)
    │
amis-agent.ts
    ↓ (运行)
smoke-test.ts / quick-start.ts
```

## 📝 使用示例

### 示例 1: 初始化 Agent

```typescript
import { initializeAgent } from "./amis-agent.js";

// 初始化时自动构建索引
await initializeAgent(); // 或指定自定义 DOCS_ROOT
```

### 示例 2: 执行查询

```typescript
import { graph } from "./amis-agent.js";
import { HumanMessage } from "@langchain/core/messages";

const state = await graph.invoke({
  messages: [new HumanMessage({ content: "创建表单" })],
  userRequirement: "创建表单",
  // ... 其他初始状态
});

console.log(state.tasks); // 查看任务
console.log(state.tasks[0].docHints); // 查看关联文档
console.log(state.finalJson); // 查看最终结果
```

### 示例 3: 手动搜索文档

```typescript
import { getIndexer } from "./docs-index.js";

const indexer = getIndexer();
const hits = indexer.search("表单输入框", 5);
hits.forEach((hit) => {
  console.log(`${hit.path}: ${hit.score.toFixed(2)}`);
});
```

## 🧪 测试清单

- [ ] 冒烟测试通过 (`pnpm test:smoke`)
- [ ] 快速启动正常 (`pnpm quick-start`)
- [ ] 无 TypeScript 编译错误
- [ ] 环境变量配置正确
- [ ] 文档索引构建成功
- [ ] 任务规划正确
- [ ] 文档检索命中
- [ ] 上下文注入正确
- [ ] 最终输出有效

## 🐛 常见问题排查

### Q: "DocsIndexer is not exported from docs-index"

**A**: 确保 `docs-index.ts` 的导出在 amis-agent.ts 中正确引入。

### Q: 索引搜索返回空

**A**: 检查 `DOCS_ROOT` 环境变量是否指向正确的文档目录。

### Q: 工作流无限循环

**A**: 检查 `shouldContinue()` 路由逻辑是否有边界条件缺失。

## 📚 参考文档

- [改造详细说明](WORKFLOW_REFACTOR.md)
- [快速参考指南](QUICK_REFERENCE.md)
- [核心设计](../index.md)

---

**最后更新**: 2026-01-07
**维护者**: AI Assistant
**状态**: ✅ 完成并验证
