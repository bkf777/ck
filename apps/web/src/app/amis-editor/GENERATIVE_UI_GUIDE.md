# Amis Agent 生成式 UI 使用指南

本文档说明如何在 `amis-agent.ts` 工作流中使用生成式 UI 组件。

## 概述

我们为 amis agent 工作流创建了多个生成式 UI 组件，用于在工具调用时实时渲染前端界面，提升用户体验。

## 可用的 UI 组件

### 1. DocRetrievalCard - 文档检索卡片

当 agent 调用 `retrieveDocumentation` 工具时渲染。

**显示内容：**

- 查询关键词和任务类型
- 检索状态（加载中/完成/失败）
- 找到的文档列表及代码示例数量

**使用方式：**

```typescript
useCopilotAction({
  name: "retrieveDocumentation",
  description: "检索 amis 相关文档",
  available: "enabled",
  parameters: [
    { name: "query", type: "string", required: true },
    { name: "taskType", type: "string", required: true },
  ],
  render: ({ args, status, result }) => {
    return (
      <DocRetrievalCard
        query={args.query}
        taskType={args.taskType}
        status={
          status === "running"
            ? "loading"
            : status === "completed"
            ? "completed"
            : "error"
        }
        result={result}
      />
    );
  },
});
```

### 2. TaskProgressCard - 任务进度卡片

当 agent 完成任务规划后渲染，展示整个工作流的执行进度。

**显示内容：**

- 任务总数和当前进度
- 进度条
- 每个任务的详细信息和状态
- 任务执行结果（可折叠查看）

**使用方式：**

```typescript
useCopilotAction({
  name: "showTaskProgress",
  description: "显示任务规划和执行进度",
  available: "enabled",
  parameters: [
    { name: "tasks", type: "array", required: true },
    { name: "currentTaskIndex", type: "number", required: true },
  ],
  render: ({ args }) => {
    return (
      <TaskProgressCard
        tasks={args.tasks}
        currentTaskIndex={args.currentTaskIndex}
      />
    );
  },
});
```

### 3. FinalResultCard - 最终结果卡片

当 agent 完成所有任务并综合结果后渲染。

**显示内容：**

- 成功提示和图标
- 复制 JSON 按钮
- 应用到编辑器按钮
- 完整配置预览（可折叠）
- 执行日志时间线

**使用方式：**

```typescript
useCopilotAction({
  name: "showFinalResult",
  description: "显示最终生成的 amis 配置",
  available: "enabled",
  parameters: [
    { name: "finalJson", type: "object", required: true },
    { name: "executionLog", type: "array", required: false },
  ],
  render: ({ args }) => {
    return (
      <FinalResultCard
        finalJson={args.finalJson}
        executionLog={args.executionLog}
      />
    );
  },
});
```

### 4. Timeline - 执行日志时间线

用于展示 agent 的执行日志，按时间顺序显示所有事件。

**使用方式：**

```typescript
<Timeline events={executionLog} />
```

## 在 Agent 中集成的步骤

### 步骤 1: 在前端注册 Copilot Actions

在 `apps/web/src/app/amis-editor/page.tsx` 的 `AmisEditorPage` 组件中添加：

```typescript
export default function AmisEditorPage() {
  // ... 现有代码 ...

  // 添加文档检索 action
  useCopilotAction({
    name: "retrieveDocumentation",
    description: "根据查询和任务类型检索 amis 相关文档",
    available: "enabled",
    parameters: [
      { name: "query", type: "string", required: true },
      { name: "taskType", type: "string", required: true },
    ],
    render: ({ args, status, result }) => {
      return (
        <DocRetrievalCard
          query={args.query}
          taskType={args.taskType}
          status={
            status === "running"
              ? "loading"
              : status === "completed"
              ? "completed"
              : "error"
          }
          result={result}
        />
      );
    },
  });

  // 添加任务进度 action
  useCopilotAction({
    name: "showTaskProgress",
    description: "显示任务规划和执行进度",
    available: "enabled",
    parameters: [
      { name: "tasks", type: "array", required: true },
      { name: "currentTaskIndex", type: "number", required: true },
    ],
    render: ({ args }) => {
      return (
        <TaskProgressCard
          tasks={args.tasks}
          currentTaskIndex={args.currentTaskIndex}
        />
      );
    },
  });

  // 添加最终结果 action
  useCopilotAction({
    name: "showFinalResult",
    description: "显示最终生成的 amis 配置",
    available: "enabled",
    parameters: [
      { name: "finalJson", type: "object", required: true },
      { name: "executionLog", type: "array", required: false },
    ],
    render: ({ args }) => {
      return (
        <FinalResultCard
          finalJson={args.finalJson}
          executionLog={args.executionLog}
        />
      );
    },
    handler: ({ finalJson }) => {
      // 自动应用生成的 schema
      updateSchema(finalJson);
      setSchema(finalJson);
    },
  });

  // ... 现有代码 ...
}
```

### 步骤 2: 在 Agent 工作流中调用这些 Actions

在 `apps/agent/src/amis-agent.ts` 中修改节点函数以调用前端 actions：

#### 在 planner_node 中调用任务进度 UI：

```typescript
async function planner_node(state: AmisAgentState, config: RunnableConfig) {
  // ... 现有的规划逻辑 ...

  // 添加一个消息来触发前端 UI 渲染
  const progressMessage = new AIMessage({
    content: "任务规划完成",
    tool_calls: [
      {
        name: "showTaskProgress",
        args: {
          tasks: tasks,
          currentTaskIndex: 0,
        },
        id: `progress_${Date.now()}`,
      },
    ],
  });

  return {
    tasks,
    currentTaskIndex: 0,
    taskResults: [],
    executionLog: [...(state.executionLog || []), event],
    userRequirement: userRequirement as string,
    messages: [progressMessage],
  };
}
```

#### 在 executor_node 中更新任务进度：

```typescript
async function executor_node(state: AmisAgentState, config: RunnableConfig) {
  // ... 现有的执行逻辑 ...

  // 每完成一个任务，更新进度 UI
  const progressMessage = new AIMessage({
    content: `完成任务 ${currentIndex + 1}/${tasks.length}`,
    tool_calls: [
      {
        name: "showTaskProgress",
        args: {
          tasks: tasks,
          currentTaskIndex: currentIndex + 1,
        },
        id: `progress_${Date.now()}`,
      },
    ],
  });

  return {
    messages: [response, progressMessage],
    taskResults: result
      ? [...(state.taskResults || []), result]
      : state.taskResults || [],
    currentTaskIndex: currentIndex + 1,
    tasks,
    executionLog: [...(state.executionLog || []), event],
  };
}
```

#### 在 composer_node 中调用最终结果 UI：

```typescript
async function composer_node(state: AmisAgentState, config: RunnableConfig) {
  // ... 现有的综合逻辑 ...

  // 调用最终结果 UI
  const resultMessage = new AIMessage({
    content: "配置生成完成",
    tool_calls: [
      {
        name: "showFinalResult",
        args: {
          finalJson: finalJson,
          executionLog: state.executionLog || [],
        },
        id: `result_${Date.now()}`,
      },
    ],
  });

  return {
    finalJson,
    executionLog: [...(state.executionLog || []), event],
    messages: [resultMessage],
  };
}
```

## UI 组件数据流

```
User Request
    ↓
[planner_node] → 生成任务列表 → showTaskProgress UI
    ↓
[executor_node] → 执行任务 → 更新 showTaskProgress UI
    ↓
[retrieveDocumentation] → 检索文档 → DocRetrievalCard UI
    ↓
[executor_node] → 生成配置 → 更新 showTaskProgress UI
    ↓
[composer_node] → 综合结果 → FinalResultCard UI
    ↓
用户可以复制或应用配置
```

## 状态管理

所有 UI 组件都支持以下状态：

- **loading**: 正在处理（显示加载动画）
- **executing**: 执行中（显示进度）
- **completed**: 已完成（显示成功图标）
- **error**: 失败（显示错误信息）
- **pending**: 等待中（显示暂停图标）

## 样式自定义

所有组件都使用 Tailwind CSS 类名，你可以通过修改这些类来自定义样式：

- 颜色：`bg-blue-50`, `bg-purple-50`, `bg-green-50`
- 边框：`border`, `border-l-4`, `rounded-lg`
- 阴影：`shadow-sm`, `shadow-md`, `shadow-lg`
- 动画：`animate-spin`, `animate-pulse`, `transition-all`

## 注意事项

1. **状态同步**: 确保 agent 状态中的 `tasks`、`currentTaskIndex`、`executionLog` 等字段与前端 UI 组件的期望数据格式一致。

2. **错误处理**: 如果任务失败，UI 会显示 `errorMessage`，确保在 agent 中正确设置错误信息。

3. **性能优化**: 对于大量任务，考虑使用虚拟滚动或分页来优化 UI 渲染性能。

4. **响应式设计**: 当前组件已经考虑了移动端和桌面端的适配，如需进一步调整可修改 Tailwind 类名。

## 示例对话流程

用户: "帮我创建一个用户注册表单"

Agent:

1. [planner_node] 分析需求，生成任务：

   - task-1: 生成用户名输入框
   - task-2: 生成密码输入框
   - task-3: 生成邮箱输入框
   - task-4: 生成提交按钮
   - task-5: 组装表单

   → UI 显示: TaskProgressCard (0/5)

2. [executor_node] 执行 task-1:

   - 调用 retrieveDocumentation 查询 "输入框"

   → UI 显示: DocRetrievalCard (找到文档)

   → UI 更新: TaskProgressCard (1/5)

3. [executor_node] 继续执行 task-2, 3, 4
   → UI 实时更新: TaskProgressCard (2/5, 3/5, 4/5)

4. [composer_node] 综合所有结果

   → UI 显示: FinalResultCard

5. 用户点击 "应用到编辑器"
   → amis 编辑器更新为新生成的表单

## 故障排除

### UI 不显示

- 检查 `available: "enabled"` 是否设置
- 检查 `render` 函数是否正确返回组件
- 检查控制台是否有错误信息

### 数据不更新

- 检查 agent 是否正确返回更新后的状态
- 检查消息中是否包含正确的 tool_calls
- 检查参数名称是否与组件 props 匹配

### 样式问题

- 确保 Tailwind CSS 已正确配置
- 检查类名是否正确
- 检查是否有 CSS 冲突

## 更多资源

- [CopilotKit 文档](https://docs.copilotkit.ai)
- [amis 文档](https://aisuda.bce.baidu.com/amis/zh-CN/components/index)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
