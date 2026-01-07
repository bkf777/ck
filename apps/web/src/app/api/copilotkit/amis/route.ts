import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import AmisEditorPage from "@/app/amis-editor/page";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  baseURL: process.env.ANTHROPIC_API_URL || "",
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
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: anthropicAdapter,
    endpoint: "/api/copilotkit/amis",
  });

  return handleRequest(req);
};
