#!/usr/bin/env node

/**
 * 快速启动脚本
 * 演示如何初始化 Agent 并运行单个查询
 */

import { initializeAgent, graph } from "./amis-agent.js";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  // 步骤 1: 初始化 Agent
  console.log("📚 初始化 amis Agent...\n");

  try {
    await initializeAgent(process.env.DOCS_ROOT);
  } catch (error) {
    console.error("初始化失败:", error);
    process.exit(1);
  }

  // 步骤 2: 准备初始输入
  const userInput =
    "我需要创建一个用户管理页面，包含添加、编辑、删除功能和数据表格";

  const initialState = {
    messages: [
      new HumanMessage({
        content: userInput,
      }),
    ],
    userRequirement: userInput,
    tasks: [],
    currentTaskIndex: 0,
    schema: {},
    executionLog: [],
    feedbackStatus: "pending" as const,
    tasksToRetry: [],
    streamedContent: "",
    error: null,
    contextDocuments: [],
    needsReplan: false,
  };

  console.log("🚀 执行查询...");
  console.log(`📝 用户输入: ${userInput}\n`);

  // 步骤 3: 执行工作流（一次迭代作为演示）
  try {
    const result = await graph.invoke(initialState, {
      recursionLimit: 50,
      configurable: { thread_id: "quick-start" },
    });

    console.log("\n✅ 执行完成！\n");

    // 显示规划结果
    if (result.tasks && result.tasks.length > 0) {
      console.log("📋 规划任务:");
      result.tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. [${task.status}] ${task.description}`);
        console.log(`     类型: ${task.type}`);
        if (task.docHints && task.docHints.length > 0) {
          console.log(`     📄 关联文档:`);
          task.docHints.forEach((h, j) => {
            console.log(`        ${j + 1}. ${h.path}`);
          });
        }
      });
    }

    // 显示执行日志
    if (result.executionLog && result.executionLog.length > 0) {
      console.log("\n📊 执行事件:");
      result.executionLog.forEach((event) => {
        console.log(`  [${event.type}] ${event.message}`);
      });
    }
  } catch (error) {
    console.error("❌ 执行失败:", error);
    process.exit(1);
  }
}

main();
