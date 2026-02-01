declare module "@copilotkit/sdk-js/langgraph" {
  import { Annotation } from "@langchain/langgraph";
  import { BaseMessage } from "@langchain/core/messages";

  export interface CopilotKitAction {
    name: string;
    description?: string;
    parameters?: any;
    handler?: any;
  }

  export interface CopilotKitState {
    actions: CopilotKitAction[];
  }

  export const CopilotKitStateAnnotation: {
    spec: {
      messages: any;
      copilotkit: any;
    };
  };

  export function convertActionsToDynamicStructuredTools(actions: any): any;
}