/**
 * 冒烟测试脚本
 * 验证工作流从规划 → 文档关联 → 执行 → 综合的端到端链路
 */

import { initializeAgent, graph, Task, ExecutionEvent } from "./amis-agent.js";
import { AgentStateAnnotation } from "./amis-agent.js";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";

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
    // messages: [
    //   new HumanMessage({
    //     content: ,
    //   }),
    // ] as BaseMessage[],
    userRequirement: `{
"platformWorksNumDist": "{"youtube":45,"tiktok":20,"ins":1356}",
"platformInteractiveDist": "{"youtube":12930,"tiktok":13818,"ins":1537641}",
"platformAccountNumDist": "{"youtube":19,"tiktok":14,"ins":591}",
"accountCatStats": {
"youtube": {
"People&Society": {
"p": 6070,
"kl": {
"MicroInfluencer": {
"p": 6070,
"c": 8,
"i": 81878
}
},
"c": 8,
"i": 81878
},
"Entertainment": {
"p": 480,
"kl": {
"MicroInfluencer": {
"p": 480,
"c": 1,
"i": 864
}
},
"c": 1,
"i": 864
},
"Education": {
"p": 1000,
"kl": {
"MicroInfluencer": {
"p": 1000,
"c": 1,
"i": 7321
}
},
"c": 1,
"i": 7321
},
"Comedy": {
"p": 480,
"kl": {
"MicroInfluencer": {
"p": 480,
"c": 1,
"i": 9982
}
},
"c": 1,
"i": 9982
},
"Travel&Adventure": {
"p": 480,
"kl": {
"MicroInfluencer": {
"p": 480,
"c": 1,
"i": 29687
}
},
"c": 1,
"i": 29687
},
"All": {
"p": 19850,
"kl": {
"Mid-tierInfluencer": {
"p": 8470,
"c": 3,
"i": 322547
},
"MicroInfluencer": {
"p": 11380,
"c": 16,
"i": 150776
}
},
"c": 19,
"i": 473323
},
"How-to&Style": {
"p": 11340,
"kl": {
"Mid-tierInfluencer": {
"p": 8470,
"c": 3,
"i": 322547
},
"MicroInfluencer": {
"p": 2870,
"c": 4,
"i": 21044
}
},
"c": 7,
"i": 343591
}
},
"tiktok": {
"Fashion&Beauty": {
"p": 5620,
"kl": {
"Mid-tierInfluencer": {
"p": 3110,
"c": 2,
"i": 2721420
},
"MicroInfluencer": {
"p": 2510,
"c": 3,
"i": 4849534
}
},
"c": 5,
"i": 7570954
},
"Lifestyle": {
"p": 4080,
"kl": {
"Mid-tierInfluencer": {
"p": 3350,
"c": 1,
"i": 19574401
},
"MicroInfluencer": {
"p": 730,
"c": 1,
"i": 1613236
}
},
"c": 2,
"i": 21187637
},
"Comedy": {
"p": 17620,
"kl": {
"MacroInfluencer": {
"p": 17620,
"c": 1,
"i": 16353039
}
},
"c": 1,
"i": 16353039
},
"Family&Parenting": {
"p": 1480,
"kl": {
"Mid-tierInfluencer": {
"p": 1480,
"c": 1,
"i": 2408349
}
},
"c": 1,
"i": 2408349
},
"Music&Dance": {
"p": 48590,
"kl": {
"Mid-tierInfluencer": {
"p": 3590,
"c": 1,
"i": 9913817
},
"MegaInfluencer": {
"p": 45000,
"c": 1,
"i": 31126657
}
},
"c": 2,
"i": 41040474
},
"Food&Drink": {
"p": 9430,
"kl": {
"Mid-tierInfluencer": {
"p": 7810,
"c": 2,
"i": 15016702
},
"MicroInfluencer": {
"p": 1620,
"c": 1,
"i": 1456871
}
},
"c": 3,
"i": 16473573
},
"All": {
"p": 86820,
"kl": {
"Mid-tierInfluencer": {
"p": 19340,
"c": 7,
"i": 49634689
},
"MegaInfluencer": {
"p": 45000,
"c": 1,
"i": 31126657
},
"MacroInfluencer": {
"p": 17620,
"c": 1,
"i": 16353039
},
"MicroInfluencer": {
"p": 4860,
"c": 5,
"i": 7919641
}
},
"c": 14,
"i": 105034026
}
},
"ins": {
"DIY&Crafts": {
"p": 16100,
"kl": {
"Mid-tierInfluencer": {
"p": 11450,
"c": 3,
"i": 3937435
},
"MicroInfluencer": {
"p": 4650,
"c": 3,
"i": 102406
}
},
"c": 6,
"i": 4039841
},
"Art": {
"p": 3770,
"kl": {
"Mid-tierInfluencer": {
"p": 3770,
"c": 1,
"i": 622624
}
},
"c": 1,
"i": 622624
},
"Business&Finance": {
"p": 384090,
"kl": {
"Mid-tierInfluencer": {
"p": 52410,
"c": 7,
"i": 4037958
},
"MegaInfluencer": {
"p": 293510,
"c": 3,
"i": 19069242
},
"MacroInfluencer": {
"p": 9940,
"c": 1,
"i": 975449
},
"MicroInfluencer": {
"p": 28230,
"c": 15,
"i": 616357
}
},
"c": 26,
"i": 24699006
},
"Entertainment": {
"p": 12670,
"kl": {
"Mid-tierInfluencer": {
"p": 10610,
"c": 2,
"i": 6126547
},
"MicroInfluencer": {
"p": 2060,
"c": 3,
"i": 484284
}
},
"c": 5,
"i": 6610831
},
"Health&Fitness": {
"p": 88120,
"kl": {
"Mid-tierInfluencer": {
"p": 60460,
"c": 17,
"i": 11227600
},
"MegaInfluencer": {
"p": 13610,
"c": 1,
"i": 4783444
},
"MacroInfluencer": {
"p": 8390,
"c": 1,
"i": 3210556
},
"MicroInfluencer": {
"p": 5660,
"c": 5,
"i": 408110
}
},
"c": 24,
"i": 19629710
},
"Fashion&Beauty": {
"p": 1172080,
"kl": {
"Mid-tierInfluencer": {
"p": 461870,
"c": 103,
"i": 97472713
},
"MegaInfluencer": {
"p": 417900,
"c": 14,
"i": 204287758
},
"MacroInfluencer": {
"p": 150390,
"c": 13,
"i": 22773033
},
"MicroInfluencer": {
"p": 141920,
"c": 152,
"i": 19932062
}
},
"c": 282,
"i": 344465566
},
"Home&Decor": {
"p": 419220,
"kl": {
"Mid-tierInfluencer": {
"p": 279880,
"c": 41,
"i": 28610903
},
"MacroInfluencer": {
"p": 88130,
"c": 5,
"i": 5115280
},
"MicroInfluencer": {
"p": 51210,
"c": 33,
"i": 3279747
}
},
"c": 79,
"i": 37005930
},
"Travel&Adventure": {
"p": 150440,
"kl": {
"Mid-tierInfluencer": {
"p": 25790,
"c": 8,
"i": 1133356
},
"MegaInfluencer": {
"p": 81000,
"c": 1,
"i": 12977170
},
"MacroInfluencer": {
"p": 33060,
"c": 2,
"i": 2371729
},
"MicroInfluencer": {
"p": 10590,
"c": 15,
"i": 4368602
}
},
"c": 26,
"i": 20850857
},
"Family&Parenting": {
"p": 213280,
"kl": {
"Mid-tierInfluencer": {
"p": 151130,
"c": 31,
"i": 69636620
},
"MegaInfluencer": {
"p": 23040,
"c": 2,
"i": 10909943
},
"MacroInfluencer": {
"p": 20310,
"c": 1,
"i": 52761
},
"MicroInfluencer": {
"p": 18800,
"c": 30,
"i": 4544024
}
},
"c": 64,
"i": 85143348
},
"Food&Drink": {
"p": 209130,
"kl": {
"Mid-tierInfluencer": {
"p": 108770,
"c": 22,
"i": 15468132
},
"MegaInfluencer": {
"p": 83730,
"c": 5,
"i": 20219497
},
"MacroInfluencer": {
"p": 9960,
"c": 1,
"i": 2831575
},
"MicroInfluencer": {
"p": 6670,
"c": 9,
"i": 2362000
}
},
"c": 37,
"i": 40881204
},
"Pets&Animals": {
"p": 20340,
"kl": {
"Mid-tierInfluencer": {
"p": 5740,
"c": 2,
"i": 1844690
},
"MicroInfluencer": {
"p": 14600,
"c": 1,
"i": 73791
}
},
"c": 3,
"i": 1918481
},
"All": {
"p": 2873630,
"kl": {
"Mid-tierInfluencer": {
"p": 1242260,
"c": 256,
"i": 272289976
},
"MegaInfluencer": {
"p": 992100,
"c": 30,
"i": 316745828
},
"MacroInfluencer": {
"p": 348440,
"c": 27,
"i": 44776292
},
"MicroInfluencer": {
"p": 290830,
"c": 278,
"i": 40060886
}
},
"c": 591,
"i": 673872982
},
"Technology": {
"p": 15270,
"kl": {
"Mid-tierInfluencer": {
"p": 14850,
"c": 4,
"i": 4120382
},
"MicroInfluencer": {
"p": 420,
"c": 1,
"i": 26187
}
},
"c": 5,
"i": 4146569
},
"Music": {
"p": 7600,
"kl": {
"Mid-tierInfluencer": {
"p": 7080,
"c": 3,
"i": 3276862
},
"MicroInfluencer": {
"p": 520,
"c": 3,
"i": 59345
}
},
"c": 6,
"i": 3336207
},
"Comedy": {
"p": 110220,
"kl": {
"Mid-tierInfluencer": {
"p": 33640,
"c": 7,
"i": 12607595
},
"MegaInfluencer": {
"p": 51200,
"c": 3,
"i": 13250072
},
"MacroInfluencer": {
"p": 22620,
"c": 2,
"i": 994611
},
"MicroInfluencer": {
"p": 2760,
"c": 4,
"i": 884285
}
},
"c": 16,
"i": 27736563
},
"Music&Dance": {
"p": 11350,
"kl": {
"Mid-tierInfluencer": {
"p": 5710,
"c": 2,
"i": 2981638
},
"MacroInfluencer": {
"p": 5640,
"c": 1,
"i": 6451298
}
},
"c": 3,
"i": 9432936
},
"Autos&Vehicles": {
"p": 3880,
"kl": {
"Mid-tierInfluencer": {
"p": 3650,
"c": 1,
"i": 1175634
},
"MicroInfluencer": {
"p": 230,
"c": 1,
"i": 94535
}
},
"c": 2,
"i": 1270169
},
"Gaming": {
"p": 2220,
"kl": {
"MicroInfluencer": {
"p": 2220,
"c": 2,
"i": 2777386
}
},
"c": 2,
"i": 2777386
},
"Sports": {
"p": 33850,
"kl": {
"Mid-tierInfluencer": {
"p": 5450,
"c": 2,
"i": 8009287
},
"MegaInfluencer": {
"p": 28110,
"c": 1,
"i": 31248702
},
"MicroInfluencer": {
"p": 290,
"c": 1,
"i": 47765
}
},
"c": 4,
"i": 39305754
}
}
},
}  生成报告并使用中文描述。`,
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
    let lastExecutionLogIndex = 0;
    const lastTaskStatusMap = new Map<string, string>();

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n📍 [Iteration ${iteration}]`);
      console.log("🔄 步骤：调用工作流...");

      // 调用工作流（同步执行一步）- 带重试机制
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          result = await graph.invoke(state, {
            recursionLimit: 50,
            configurable: { thread_id: "test-thread" },
          });
          break; // 成功则跳出重试循环
        } catch (error) {
          const err = error as any;
          retryCount++;

          // 检查是否是网络错误
          const isNetworkError =
            err.code === "ECONNRESET" ||
            err.code === "ETIMEDOUT" ||
            err.code === "EHOSTUNREACH" ||
            err.message?.includes("fetch failed") ||
            err.message?.includes("read ECONNRESET");

          if (isNetworkError && retryCount < maxRetries) {
            const waitTime = Math.min(
              1000 * Math.pow(2, retryCount - 1),
              10000,
            ); // 指数退避
            console.log(
              `⚠️ 网络错误 (${err.code}), ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          // 如果不是网络错误或重试次数已尽，抛出错误
          throw error;
        }
      }

      // 更新状态
      state = result;
      console.log("✅ 步骤：工作流执行完成");

      // 打印新增执行日志（逐步）
      if (
        state.executionLog &&
        state.executionLog.length > lastExecutionLogIndex
      ) {
        console.log("🧩 步骤：新增执行事件");
        for (
          let i = lastExecutionLogIndex;
          i < state.executionLog.length;
          i++
        ) {
          const event = state.executionLog[i];
          const timestamp = new Date(event.timestamp).toLocaleTimeString(
            "zh-CN",
          );
          console.log(
            `   [${i + 1}] ${timestamp} | ${event.type.padEnd(20)} | ${
              event.message || ""
            }`,
          );
        }
        lastExecutionLogIndex = state.executionLog.length;
      }

      // 打印任务状态变化（逐步）
      if (state.tasks && state.tasks.length > 0) {
        console.log("🧩 步骤：任务状态检查");
        state.tasks.forEach((task, i) => {
          const previousStatus = lastTaskStatusMap.get(task.id);
          if (previousStatus !== task.status) {
            console.log(
              `   [任务 ${i + 1}] ${task.description} 状态变化：${previousStatus || "(无)"} -> ${task.status}`,
            );
            lastTaskStatusMap.set(task.id, task.status);
          }
        });
      }

      // 打印关键信息
      if (state.tasks && state.tasks.length > 0) {
        console.log(`📋 任务数: ${state.tasks.length}`);
        console.log(
          `   当前索引: ${state.currentTaskIndex}/${state.tasks.length}`,
        );

        // 打印当前任务
        if (state.currentTaskIndex < state.tasks.length) {
          const currentTask = state.tasks[state.currentTaskIndex];
          console.log(
            `   当前任务: [${currentTask.status}] ${currentTask.description}`,
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
          }`,
        );
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("📋 [SmokeTest] 任务执行结果:");
    console.log("=".repeat(80));

    if (state.tasks && state.tasks.length > 0) {
      state.tasks.forEach((task, i) => {
        console.log(
          `[${i + 1}] [${task.status.padEnd(10)}] ${task.description}`,
        );
        if (task.docHints && task.docHints.length > 0) {
          console.log(
            `     📄 文档: ${task.docHints.map((h) => h.path).join(", ")}`,
          );
        }
        if (task.result) {
          console.log(
            `     ✅ 结果: ${JSON.stringify(task.result).slice(0, 50)}...`,
          );
        }
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎯 [SmokeTest] 最终输出:");
    console.log("=".repeat(80));

    let finalOutput = null;
    if (state.finalJson && Object.keys(state.finalJson).length > 0) {
      finalOutput = state.finalJson;
      console.log(JSON.stringify(state.finalJson, null, 2));
    } else if (state.schema && Object.keys(state.schema).length > 0) {
      finalOutput = state.schema;
      console.log(JSON.stringify(state.schema, null, 2));
    } else {
      console.log("❌ 无最终结果");
    }

    // 输出结果到 .test 文件夹
    if (finalOutput) {
      const testDir = path.join(process.cwd(), ".test");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputPath = path.join(testDir, `smoke-test-${timestamp}.json`);

      const testResult = {
        timestamp: new Date().toISOString(),
        status: state.error ? "failed" : "success",
        error: state.error || null,
        executionLog: state.executionLog || [],
        tasks: state.tasks || [],
        finalOutput: finalOutput,
      };

      fs.writeFileSync(
        outputPath,
        JSON.stringify(testResult, null, 2),
        "utf-8",
      );
      console.log(`\n💾 测试结果已保存到: ${outputPath}`);
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
