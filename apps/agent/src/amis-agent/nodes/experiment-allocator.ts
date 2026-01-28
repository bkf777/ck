import { RunnableConfig } from "@langchain/core/runnables";
import { AmisAgentState } from "../state.js";

/**
 * A/B 测试流量分配节点
 * 职责：随机将用户分配到实验组或对照组
 */
export async function experiment_allocator_node(
  state: AmisAgentState,
  config: RunnableConfig,
) {
  // 如果已经分配过，保持不变（但在 START -> route_start -> this 的路径下，通常是新会话）
  if (state.abTestGroup) {
    return {};
  }

  const isGroupB = Math.random() < 0.5;
  const group = isGroupB ? "B" : "A";

  console.log(
    `\n🎲 [AB-Test] 流量分配: Group ${group} (${isGroupB ? "实验组: InputProcessor" : "对照组: Planner"})`,
  );

  return {
    abTestGroup: group,
  };
}
