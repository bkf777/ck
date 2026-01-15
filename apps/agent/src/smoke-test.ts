/**
 * 冒烟测试脚本
 * 验证工作流从规划 → 文档关联 → 执行 → 综合的端到端链路
 */

import { initializeAgent, graph, Task, ExecutionEvent } from "./amis-agent.js";
import { AgentStateAnnotation } from "./amis-agent.js";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";

/**
 * 运行冒烟测试
 */
async function runSmokeTest() {
  console.log("🧪 [SmokeTest] 开始端到端冒烟测试\n");

  // 初始化 Agent（构建文档索引）
  console.log("📚 初始化文档索引...");
  try {
    await initializeAgent(process.env.DOCS_ROOT);
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  }

  // 创建初始状态
  const initialInput = {
    messages: [
      new HumanMessage({
        content:
          "我需要创建一个包含表单和数据表格的管理页面。表单有文本输入框、下拉选择框、日期选择和提交按钮。表格显示数据列表。",
      }),
    ] as BaseMessage[],
    userRequirement:
      "创建包含表单和CRUD表格的管理页面，表单包括文本输入、下拉框、日期选择，表格显示数据，支持编辑和删除。",
    tasks: [] as Task[],
    currentTaskIndex: 0,
    finalJson: {},
    executionLog: [] as ExecutionEvent[],
    feedbackStatus: "pending" as const,
    tasksToRetry: [],
    streamedContent: "",
    error: null,
    contextDocuments: [] as any[],
    needsReplan: false,
  };

  console.log("🚀 [SmokeTest] 执行工作流\n");
  console.log("用户需求:", initialInput.userRequirement);
  console.log("=" + "=".repeat(79));

  try {
    // 执行工作流（限制迭代次数防止无限循环）
    let state = initialInput as unknown as typeof AgentStateAnnotation.State;
    let iteration = 0;
    const maxIterations = 20;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n📍 [Iteration ${iteration}]`);

      // 调用工作流（同步执行一步）
      const result = await graph.invoke(state, {
        configurable: { thread_id: "test-thread" },
      });

      // 更新状态
      state = result;

      // 打印关键信息
      if (state.tasks && state.tasks.length > 0) {
        console.log(`📋 任务数: ${state.tasks.length}`);
        console.log(
          `   当前索引: ${state.currentTaskIndex}/${state.tasks.length}`
        );

        // 打印当前任务
        if (state.currentTaskIndex < state.tasks.length) {
          const currentTask = state.tasks[state.currentTaskIndex];
          console.log(
            `   当前任务: [${currentTask.status}] ${currentTask.description}`
          );
          if (currentTask.docHints && currentTask.docHints.length > 0) {
            console.log(`   文档命中: ${currentTask.docHints.length} 个`);
            currentTask.docHints.forEach((h, i) => {
              console.log(`      ${i + 1}. ${h.path} (${h.score?.toFixed(2)})`);
            });
          }
        }
      }

      if (state.contextDocuments && state.contextDocuments.length > 0) {
        console.log(`📄 上下文文档: ${state.contextDocuments.length} 个`);
      }

      if (state.finalJson && Object.keys(state.finalJson).length > 0) {
        console.log(`✅ 最终结果已生成`);
        console.log(`   类型: ${(state.finalJson as any).type}`);
      }

      // 检查是否完成
      if (
        state.currentTaskIndex >= (state.tasks?.length || 0) &&
        state.finalJson &&
        Object.keys(state.finalJson).length > 0
      ) {
        console.log("\n🎉 工作流完成！所有任务已执行，结果已综合。");
        break;
      }

      // 检查错误
      if (state.error) {
        console.log(`\n⚠️ 执行出现错误: ${state.error}`);
        break;
      }
    }

    // 输出最终结果
    console.log("\n" + "=".repeat(80));
    console.log("📊 [SmokeTest] 执行日志摘要:");
    console.log("=".repeat(80));

    if (state.executionLog && state.executionLog.length > 0) {
      state.executionLog.forEach((event, i) => {
        const timestamp = new Date(event.timestamp).toLocaleTimeString("zh-CN");
        console.log(
          `[${i + 1}] ${timestamp} | ${event.type.padEnd(20)} | ${
            event.message || ""
          }`
        );
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("📋 [SmokeTest] 任务执行结果:");
    console.log("=".repeat(80));

    if (state.tasks && state.tasks.length > 0) {
      state.tasks.forEach((task, i) => {
        console.log(
          `[${i + 1}] [${task.status.padEnd(10)}] ${task.description}`
        );
        if (task.docHints && task.docHints.length > 0) {
          console.log(
            `     📄 文档: ${task.docHints.map((h) => h.path).join(", ")}`
          );
        }
        if (task.result) {
          console.log(
            `     ✅ 结果: ${JSON.stringify(task.result).slice(0, 50)}...`
          );
        }
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎯 [SmokeTest] 最终输出:");
    console.log("=".repeat(80));

    if (state.finalJson && Object.keys(state.finalJson).length > 0) {
      console.log(JSON.stringify(state.finalJson, null, 2));
    } else {
      console.log("❌ 无最终结果");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ 冒烟测试完成！\n");
  } catch (error) {
    console.error("\n❌ [SmokeTest] 执行失败:", error);
    process.exit(1);
  }
}

// 运行测试
runSmokeTest().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
