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

  const response = await handleRequest(req);

  if (!response.body) {
    return response;
  }

  let buffer = "";
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  const stream = response.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        let text = "";
        if (typeof chunk === "string") {
          text = chunk;
        } else {
          text = textDecoder.decode(chunk, { stream: true });
        }
        buffer += text;
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line

        for (const line of lines) {
          if (!line.trim()) {
            controller.enqueue(textEncoder.encode("\n"));
            continue;
          }

          let outputLine = line;
          try {
            // Check for SSE "data: " prefix
            const isSSE = line.startsWith("data: ");
            const jsonStr = isSSE ? line.slice(6) : line;

            // Skip non-JSON lines (like "event: ..." or "[DONE]")
            if (jsonStr.trim() !== "[DONE]") {
              const data = JSON.parse(jsonStr);

              // Recursively remove metadata
              const clean = (obj: any) => {
                if (obj && typeof obj === "object") {
                  if ("metadata" in obj) delete obj.metadata;
                  // Traverse specific fields
                  if (obj.data) clean(obj.data);
                  if (obj.event) clean(obj.event);
                  // Handle nested state string if present (AgentStateMessage)
                  if (obj.state && typeof obj.state === "string") {
                    try {
                      const stateObj = JSON.parse(obj.state);
                      clean(stateObj);
                      obj.state = JSON.stringify(stateObj);
                    } catch (e) {
                      // ignore parse error of state string
                    }
                  }
                }
              };
              clean(data);

              outputLine = (isSSE ? "data: " : "") + JSON.stringify(data);
            }
          } catch (e) {
            // If parsing fails, just pass the original line
          }

          controller.enqueue(textEncoder.encode(outputLine + "\n"));
        }
      },
      flush(controller) {
        if (buffer) {
          // Process remaining buffer
          let outputLine = buffer;
          try {
            const isSSE = buffer.startsWith("data: ");
            const jsonStr = isSSE ? buffer.slice(6) : buffer;
            if (jsonStr.trim() !== "[DONE]") {
              const data = JSON.parse(jsonStr);
              if (data && typeof data === "object") {
                if ("metadata" in data) delete data.metadata;
              }
              outputLine = (isSSE ? "data: " : "") + JSON.stringify(data);
            }
          } catch (e) {}
          controller.enqueue(textEncoder.encode(outputLine));
        }
      },
    })
  );

  return new NextResponse(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};
