"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CopilotSidebar } from "@copilotkit/react-ui";
import {
  useCoAgent,
  useCopilotAction,
  useCopilotReadable,
} from "@copilotkit/react-core";

// 动态导入 qiankun 避免 SSR 报错
let loadMicroApp: any;

// 声明全局类型
declare global {
  interface Window {
    amisRequire?: any;
    amisScoped?: any;
  }
}

type AmisInstance = {
  updateSchema: (schema: Record<string, unknown>) => void;
  updateProps: (props: Record<string, unknown>) => void;
};

// ============================================================
// 类型定义
// ============================================================

type Task = {
  id: string;
  description: string;
  type: string;
  priority: number;
  docPaths: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  retryCount?: number;
  errorMessage?: string;
};

type ExecutionEvent = {
  type:
    | "task_start"
    | "doc_retrieval"
    | "docs_found"
    | "generating"
    | "generation_progress"
    | "task_complete"
    | "error"
    | "feedback";
  timestamp: string;
  taskId?: string;
  message?: string;
  data?: any;
};

type AgentState = {
  tasks?: Task[];
  currentTaskIndex?: number;
  executionLog?: ExecutionEvent[];
  finalJson?: object;
  userRequirement?: string;
};

export default function AmisEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const microAppRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [schema, setSchema] = useState<Record<string, unknown>>({
    type: "page",
    title: "Hello Amis",
    body: "This is a qiankun sub app (React 16)",
  });

  // 使用 useCoAgent 连接到 AmisEditorPageAgent
  const { state, setState } = useCoAgent<AgentState>({
    name: "AmisEditorPageAgent",
    initialState: {
      tasks: [],
      currentTaskIndex: 0,
      executionLog: [],
      finalJson: {},
      userRequirement: "",
    },
  });

  // 监听 agent 状态变化（用于调试）
  useEffect(() => {
    console.log("AmisEditorPageAgent state updated:", state);
  }, [state]);

  const ref = useRef<AmisInstance | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 让 Copilot 能够读取当前的 schema
  useCopilotReadable({
    description: "当前 amis 页面的配置 (schema)",
    value: schema,
  });

  // 让 Copilot 能够更新 schema
  useCopilotAction({
    name: "updateAmisSchema",
    description: "更新 amis 页面配置",
    parameters: [
      {
        name: "schema",
        type: "object",
        description: "新的 amis schema 配置",
        required: true,
      },
    ],
    handler: ({ schema }) => {
      console.log("Updating schema via Copilot:", schema);
      updateSchema(schema as Record<string, unknown>);
      setSchema(schema as Record<string, unknown>);
    },
  });

  // useCopilotAction({
  //   name: "retrieveDocumentation",
  //   description: "检索 amis 相关文档",
  //   available: "enabled",
  //   parameters: [
  //     { name: "query", type: "string", required: true },
  //     { name: "taskType", type: "string", required: true },
  //   ],
  //   render: ({ args, status, result }) => {
  //     return (
  //       <DocRetrievalCard
  //         query={args.query}
  //         taskType={args.taskType}
  //         status={status}
  //         result={result}
  //       />
  //     );
  //   },
  // });

  // useEffect(() => {
  //   if (isClient && containerRef.current && !microAppRef.current) {
  //     // 只有在客户端才导入 qiankun
  //     import("qiankun").then((m) => {
  //       loadMicroApp = m.loadMicroApp;
  //       microAppRef.current = loadMicroApp({
  //         name: "amis-app",
  //         entry: "//localhost:3001",
  //         container: containerRef.current,
  //         props: {
  //           initialSchema: schemaRef.current,
  //           onSchemaChange: (value: Record<string, unknown>) => {
  //             console.log("Schema changed in sub-app:", value);
  //             schemaRef.current = value;
  //           },
  //         },
  //       });
  //     });
  //   }

  //   return () => {
  //     if (microAppRef.current) {
  //       microAppRef.current.unmount();
  //       microAppRef.current = null;
  //     }
  //   };
  // }, [isClient]);

  // 初始化 amis
  useEffect(() => {
    if (sdkReady && isClient && containerRef.current && !window.amisScoped) {
      const amis = window.amisRequire("amis/embed");
      ref.current = amis.embed(containerRef.current, schema);
    }
  }, [sdkReady, isClient]);

  // 当 schema 更新时重新渲染
  const updateSchema = (newSchema: Record<string, unknown>) => {
    console.log(
      "即将更新 ",
      newSchema,
      !!(ref.current && ref.current.updateProps)
    );
    if (ref.current && !!ref.current.updateProps) {
      ref.current.updateSchema(newSchema);
    }
  };

  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
        Loading Editor...
      </div>
    );
  }

  return (
    <>
      {/* 加载 amis SDK 样式 */}
      <link rel="stylesheet" href="/amis/sdk.css" />
      <link rel="stylesheet" href="/amis/helper.css" />
      <link rel="stylesheet" href="/amis/iconfont.css" />

      {/* 加载 amis SDK 脚本 */}
      <Script
        src="/amis/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Amis SDK loaded");
          setSdkReady(true);
        }}
        onError={(e) => {
          console.error("Failed to load Amis SDK:", e);
        }}
      />

      <main className="h-screen w-full relative flex">
        <div className="flex-1 h-full overflow-hidden">
          <div
            ref={containerRef}
            id="amis-app-container"
            className="h-full w-full"
          />
        </div>
        <CopilotSidebar
          instructions="你是一个低代码专家。你可以通过调用 updateAmisSchema 来帮助用户生成或修改 amis 页面配置。你可以看到当前的 schema，并在用户要求时进行改进。"
          defaultOpen={true}
          labels={{
            title: "Amis AI 助手",
            initial:
              "你好！我可以帮你通过微前端方式设计低代码页面。你可以对我说：'帮我加一个注册表单' 或者 '修改页面标题'。",
          }}
        />
      </main>
    </>
  );
}

// ============================================================
// 生成式 UI 组件
// ============================================================

/**
 * 状态徽章组件
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { color: string; icon: string; text: string }
  > = {
    loading: {
      color: "bg-yellow-100 text-yellow-800",
      icon: "⏳",
      text: "处理中",
    },
    completed: {
      color: "bg-green-100 text-green-800",
      icon: "✅",
      text: "完成",
    },
    error: { color: "bg-red-100 text-red-800", icon: "❌", text: "失败" },
    executing: {
      color: "bg-blue-100 text-blue-800",
      icon: "⚙️",
      text: "执行中",
    },
    pending: { color: "bg-gray-100 text-gray-800", icon: "⏸️", text: "等待中" },
  };

  const config = statusConfig[status] || statusConfig.loading;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}
    >
      <span>{config.icon}</span>
      {config.text}
    </span>
  );
}

/**
 * 文档检索卡片组件
 * 用于 retrieveDocumentation 工具调用时渲染
 */
function DocRetrievalCard({
  query,
  taskType,
  status = "inProgress",
  result,
}: {
  query?: string;
  taskType?: string;
  status?: "complete" | "executing" | "inProgress";
  result?: any;
}) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <h4 className="font-bold text-gray-800">文档检索</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-gray-600">查询关键词：</span>
          <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">
            {query}
          </code>
        </p>
        <p>
          <span className="text-gray-600">任务类型：</span>
          <code className="bg-purple-100 px-2 py-0.5 rounded text-xs">
            {taskType}
          </code>
        </p>

        {status === "inProgress" && (
          <div className="flex items-center gap-2 mt-3 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            <span>正在检索相关文档...</span>
          </div>
        )}

        {status === "complete" && result?.success && (
          <div className="mt-3 space-y-2">
            <p className="text-green-600 font-medium">
              ✅ 找到 {result.count} 个相关文档
            </p>
            <div className="bg-white rounded p-2 max-h-40 overflow-auto">
              {result.documents?.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="text-xs border-b last:border-0 pb-1 mb-1 last:mb-0"
                >
                  <p className="text-blue-700 font-medium">📄 {doc.path}</p>
                  <p className="text-gray-500 mt-0.5">
                    {doc.codeExamples?.length || 0} 个代码示例
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 任务进度卡片组件
 * 用于显示任务规划和执行进度
 */
function TaskProgressCard({
  tasks,
  currentTaskIndex,
}: {
  tasks: Task[];
  currentTaskIndex: number;
}) {
  if (!tasks || tasks.length === 0) return null;

  const progress = (currentTaskIndex / tasks.length) * 100;

  return (
    <div className="bg-white border rounded-lg shadow-md p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <h4 className="font-bold text-gray-800">任务规划</h4>
        </div>
        <span className="text-sm text-gray-500">
          {currentTaskIndex}/{tasks.length}
        </span>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-2 max-h-60 overflow-auto">
        {tasks.map((task, index) => {
          const isCompleted = index < currentTaskIndex;
          const isCurrent = index === currentTaskIndex;
          const isPending = index > currentTaskIndex;

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-2 rounded transition-all ${
                isCompleted
                  ? "bg-green-50"
                  : isCurrent
                  ? "bg-purple-50 border border-purple-300"
                  : "bg-gray-50"
              }`}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-purple-500 text-white animate-pulse"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? "text-purple-800" : "text-gray-700"
                  }`}
                >
                  {task.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                    {task.type}
                  </span>
                  {task.docPaths && task.docPaths.length > 0 && (
                    <span className="text-xs text-gray-500">
                      📄 {task.docPaths.length} 文档
                    </span>
                  )}
                </div>
                {isCurrent && task.status === "in_progress" && (
                  <div className="flex items-center gap-2 mt-2 text-purple-600 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent" />
                    <span>正在生成配置...</span>
                  </div>
                )}
                {isCompleted && task.result && (
                  <details className="mt-1">
                    <summary className="text-xs text-green-600 cursor-pointer hover:underline">
                      查看生成结果
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-auto max-h-24">
                      {JSON.stringify(task.result, null, 2)}
                    </pre>
                  </details>
                )}
                {isCompleted && task.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">
                    ❌ {task.errorMessage}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 最终结果卡片组件
 * 用于显示生成的 amis JSON 配置
 */
function FinalResultCard({
  finalJson,
  executionLog,
}: {
  finalJson: object;
  executionLog?: ExecutionEvent[];
}) {
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(finalJson, null, 2));
  };

  const handleApplySchema = () => {
    // 触发自定义事件来应用 schema
    window.dispatchEvent(
      new CustomEvent("apply-amis-schema", { detail: finalJson })
    );
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 mb-3 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎉</span>
          <div>
            <h4 className="font-bold text-lg text-gray-800">配置生成完成</h4>
            <p className="text-sm text-gray-600">amis JSON 已准备就绪</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
            onClick={handleCopyJson}
          >
            <span>📋</span> 复制 JSON
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
            onClick={handleApplySchema}
          >
            <span>✨</span> 应用到编辑器
          </button>
        </div>
      </div>

      {/* JSON 预览 */}
      <details className="mb-3" open>
        <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-blue-600">
          📄 查看完整配置 (点击展开/折叠)
        </summary>
        <div className="mt-2 relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-96">
            {JSON.stringify(finalJson, null, 2)}
          </pre>
        </div>
      </details>

      {/* 执行日志 */}
      {executionLog && executionLog.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-blue-600">
            📊 执行日志 ({executionLog.length} 条记录)
          </summary>
          <div className="mt-2 bg-white rounded-lg p-3 max-h-48 overflow-auto">
            {executionLog.map((event, index) => (
              <div
                key={index}
                className="text-xs border-l-2 border-gray-300 pl-3 mb-2 last:mb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      event.type === "error"
                        ? "bg-red-100 text-red-700"
                        : event.type === "task_complete"
                        ? "bg-green-100 text-green-700"
                        : event.type === "task_start"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {event.type}
                  </span>
                </div>
                {event.message && (
                  <p className="text-gray-600 mt-1">{event.message}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * 执行日志时间线组件
 */
function Timeline({ events }: { events: ExecutionEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={index}
          className="flex items-start gap-3 pb-2 last:pb-0 border-b last:border-0 border-gray-100"
        >
          <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  event.type === "error"
                    ? "bg-red-100 text-red-700"
                    : event.type === "task_complete"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {event.type}
              </span>
            </div>
            {event.message && (
              <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
            )}
            {event.taskId && (
              <p className="text-xs text-gray-400">任务: {event.taskId}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 导出组件供外部使用
export {
  DocRetrievalCard,
  TaskProgressCard,
  FinalResultCard,
  StatusBadge,
  Timeline,
};
