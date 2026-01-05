"use client";

import { useEffect, useRef, useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";

// 动态导入 qiankun 避免 SSR 报错
let loadMicroApp: any;

export default function AmisEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const microAppRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const schemaRef = useRef({
    type: "page",
    title: "Hello Amis",
    body: "This is a qiankun sub app (React 16)",
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 让 Copilot 能够读取当前的 schema
  useCopilotReadable({
    description: "当前 amis 页面的配置 (schema)",
    value: schemaRef.current,
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
      schemaRef.current = schema as Record<string, unknown>;
      if (microAppRef.current && microAppRef.current.update) {
        microAppRef.current.update({ schema });
      }
    },
  });

  useEffect(() => {
    if (isClient && containerRef.current && !microAppRef.current) {
      // 只有在客户端才导入 qiankun
      import("qiankun").then((m) => {
        loadMicroApp = m.loadMicroApp;
        microAppRef.current = loadMicroApp({
          name: "amis-app",
          entry: "//localhost:3001",
          container: containerRef.current,
          props: {
            initialSchema: schemaRef.current,
            onSchemaChange: (value: Record<string, unknown>) => {
              console.log("Schema changed in sub-app:", value);
              schemaRef.current = value;
            },
          },
        });
      });
    }

    return () => {
      if (microAppRef.current) {
        microAppRef.current.unmount();
        microAppRef.current = null;
      }
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
        Loading Editor...
      </div>
    );
  }

  return (
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
  );
}
