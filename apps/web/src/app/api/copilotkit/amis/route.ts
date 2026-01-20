import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import AmisEditorPage from "@/app/amis-editor/page";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  baseURL: process.env.ANTHROPIC_API_URL || "",
  timeout: 12000000, // SDK 请求超时（2分钟）
});

const anthropicAdapter = new AnthropicAdapter({
  anthropic,
  model: "glm-4.7",
});

const runtime = new CopilotRuntime({
  agents: {
    AmisEditorPageAgent: new LangGraphAgent({
      deploymentUrl:
        process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "amisAgent",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
      assistantConfig: {
        configurable: {
          recursionLimit: 100,
        },
      },
    }),
  },
});

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter: anthropicAdapter,
      endpoint: "/api/copilotkit/amis",
    });

    return handleRequest(req);
  } catch (error) {
    console.error("Agent connection error:", error);
    return NextResponse.json(
      {
        error: "Agent service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
};

// 配置 Next.js API 路由超时（Edge Runtime 不支持此配置）
export const maxDuration = 120; // 2分钟
