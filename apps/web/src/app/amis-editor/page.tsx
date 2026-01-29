"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
// ... imports
import { CopilotSidebar, CopilotChat } from "@copilotkit/react-ui";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  useCoAgent,
  useCoAgentStateRender,
  useCopilotReadable,
  useFrontendTool,
} from "@copilotkit/react-core";

import { type AmisAgentState } from "../../../../agent/src/amis-agent/state";
import {
  type Task,
  type ExecutionEvent,
} from "../../../../agent/src/amis-agent/types";

// 动态导入 qiankun 避免 SSR 报错
let loadMicroApp: any;

const DEFAULT_SCHEMA = {
  type: "page",
  // title: "AI Low-Code Introduction",
  className:
    "bg-white dark:bg-slate-950 font-sans h-full transition-colors duration-300",
  cssVars: {
    "--primary": "#6366f1",
    "--primary-onHover": "#4f46e5",
    "--text-color": "#1f2937",
  },
  css: `
    html.dark .cxd-Page { background-color: transparent !important; color: #f8fafc !important; }
    html.dark .cxd-Card { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-Panel { background-color: #1e293b !important; border-color: #334155 !important; }
    html.dark .cxd-Panel-title { color: #f8fafc !important; border-bottom-color: #334155 !important; }
    html.dark .cxd-TextControl-input { background-color: #0f172a !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-TextControl-input:focus { border-color: #6366f1 !important; }
    html.dark .cxd-Button--default { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
    html.dark .cxd-Button--default:hover { background-color: #334155 !important; }
  `,
  body: [
    // Hero Section
    {
      type: "wrapper",
      className:
        "bg-slate-50 dark:bg-slate-900 relative overflow-hidden pb-20 pt-10 transition-colors duration-300",
      body: [
        {
          type: "tpl",
          tpl: `
            <div class="relative z-10 text-center max-w-4xl mx-auto px-4">
              <div class="inline-block mb-4 px-4 py-1.5 rounded-full bg-linear-to-r from-violet-100 to-fuchsia-100 text-violet-700 font-semibold text-sm border border-violet-200 shadow-sm">
                ✨ Next Generation UI Builder
              </div>
              <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-amber-200! dark:text-white mb-6 leading-tight">
                Build <span class="bg-clip-text text-transparent bg-linear-to-r from-violet-600 via-fuchsia-500 to-pink-500">Amis Pages</span> <br/>
                with <span class="italic font-serif text-slate-700 dark:text-slate-200">Natural Language</span>
              </h1>
              <p class="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Describe your dream interface, and watch our AI agent instantly weave it into reality. No complex coding required—just pure creativity.
              </p>
              <div class="flex gap-4 justify-center">
                 <button class="px-8 py-4 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-violet-200 dark:shadow-none hover:shadow-2xl hover:scale-105 transition-all transform flex items-center gap-2 border border-transparent">
                   <span>Start Building</span> <i class="fa fa-arrow-right"></i>
                 </button>
                 <button class="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                   <i class="fa fa-play-circle text-violet-500"></i> <span>Watch Demo</span>
                 </button>
              </div>
            </div>
            
            <!-- Decorative Blobs -->
            <div class="absolute top-0 left-0 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 dark:opacity-20 animate-blob"></div>
            <div class="absolute top-0 right-0 w-96 h-96 bg-yellow-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 dark:opacity-20 animate-blob animation-delay-2000"></div>
            <div class="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 dark:bg-fuchsia-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 dark:opacity-20 animate-blob animation-delay-4000"></div>
          `,
        },
      ],
    },

    // Features Grid
    {
      type: "wrapper",
      className: "py-20 px-4 max-w-7xl mx-auto",
      body: [
        {
          type: "tpl",
          tpl: "<div class='text-center mb-16'><h2 class='text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4'>Why Choose AI Low-Code?</h2><p class='text-slate-500 dark:text-slate-400 max-w-2xl mx-auto'>Experience the perfect fusion of development speed and design flexibility.</p></div>",
        },
        {
          type: "grid",
          columns: [
            {
              md: 4,
              body: [
                {
                  type: "card",
                  className:
                    "h-full border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/50 hover:shadow-xl transition-all hover:-translate-y-2 rounded-2xl p-6 bg-white dark:bg-slate-800 group",
                  body: [
                    {
                      type: "tpl",
                      className: "flex flex-col h-full",
                      tpl: `
                        <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 group-hover:scale-110 transition-transform">
                          <i class="fa fa-magic"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-3">Instant Generation</h3>
                        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">Turn "Login Form" or "Dashboard" into fully functional code in seconds. The fastest way from idea to UI.</p>
                      `,
                    },
                  ],
                },
              ],
            },
            {
              md: 4,
              body: [
                {
                  type: "card",
                  className:
                    "h-full border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/50 hover:shadow-xl transition-all hover:-translate-y-2 rounded-2xl p-6 bg-white dark:bg-slate-800 group",
                  body: [
                    {
                      type: "tpl",
                      className: "flex flex-col h-full",
                      tpl: `
                        <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-fuchsia-400 to-pink-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
                          <i class="fa fa-paint-brush"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800 mb-3">Adaptive Styling</h3>
                        <p class="text-slate-500 leading-relaxed">Our AI understands aesthetics. It applies modern, beautiful styles using Tailwind and Amis best practices automatically.</p>
                      `,
                    },
                  ],
                },
              ],
            },
            {
              md: 4,
              body: [
                {
                  type: "card",
                  className:
                    "h-full border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/50 hover:shadow-xl transition-all hover:-translate-y-2 rounded-2xl p-6 bg-white dark:bg-slate-800 group",
                  body: [
                    {
                      type: "tpl",
                      className: "flex flex-col h-full",
                      tpl: `
                        <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                          <i class="fa fa-code"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800 mb-3">Developer Friendly</h3>
                        <p class="text-slate-500 leading-relaxed">Not just a toy. Export clean, maintainable JSON schema. Seamlessly integrate into your existing Amis projects.</p>
                      `,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Interactive Demo Visualizer
    {
      type: "wrapper",
      className:
        "bg-slate-900 dark:bg-black text-white rounded-3xl mx-4 md:mx-10 mb-20 p-8 md:p-16 relative overflow-hidden border border-slate-800 dark:border-slate-800 shadow-2xl",
      body: [
        {
          type: "grid",
          columns: [
            {
              md: 6,
              columnClassName: "flex flex-col justify-center relative z-10",
              body: [
                {
                  type: "tpl",
                  tpl: `
                                <div class="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-md">🤖 Interactive Workflow</div>
                                <h2 class="text-4xl md:text-5xl font-bold mb-6 dark:text-white!">Chat with your UI</h2>
                                <p class="text-slate-300 text-lg mb-8 leading-relaxed dark:text-slate-200!">
                                    Don't struggle with documentation. Just tell the Copilot what you need. 
                                    Modify layouts, change colors, or bind data sources using natural conversation.
                                </p>
                                <ul class="space-y-4 mb-8">
                                    <li class="flex items-center gap-3">
                                        <span class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs"><i class="fa fa-check"></i></span>
                                        <span class="text-slate-200">Context-aware modifications</span>
                                    </li>
                                    <li class="flex items-center gap-3">
                                        <span class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs"><i class="fa fa-check"></i></span>
                                        <span class="text-slate-200">Instant preview & feedback loop</span>
                                    </li>
                                    <li class="flex items-center gap-3">
                                        <span class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs"><i class="fa fa-check"></i></span>
                                        <span class="text-slate-200">Access to all Amis components</span>
                                    </li>
                                </ul>
                             `,
                },
              ],
            },
            {
              md: 6,
              columnClassName: "relative z-10 mt-10 md:mt-0",
              body: [
                {
                  type: "panel",
                  className:
                    "bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl skew-y-1 transform transition hover:skew-y-0 duration-500",
                  body: [
                    {
                      type: "tpl",
                      tpl: "<div class='flex items-center gap-2 mb-4 border-b border-white/10 pb-2'><div class='w-3 h-3 rounded-full bg-red-500'></div><div class='w-3 h-3 rounded-full bg-yellow-500'></div><div class='w-3 h-3 rounded-full bg-green-500'></div><div class='ml-auto text-xs text-slate-400'>Preview</div></div>",
                    },
                    {
                      type: "form",
                      title: "User Registration",
                      mode: "horizontal",
                      className: "bg-white dark:bg-slate-800 rounded-lg p-6",
                      body: [
                        {
                          type: "input-text",
                          name: "name",
                          label: "Full Name",
                          placeholder: "e.g. John Doe",
                        },
                        {
                          type: "input-email",
                          name: "email",
                          label: "Email Address",
                          placeholder: "john@example.com",
                        },
                        {
                          type: "input-password",
                          name: "password",
                          label: "Password",
                        },
                        {
                          type: "submit",
                          label: "Create Account",
                          level: "primary",
                          className: "w-full bg-blue-600 border-0",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Background glow
        {
          type: "tpl",
          tpl: "<div class='absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-linear-to-br from-violet-600 to-fuchsia-600 rounded-full blur-[100px] opacity-20'></div>",
        },
      ],
    },

    // Footer
    {
      type: "tpl",
      className:
        "bg-slate-50 dark:bg-slate-900 py-12 border-t border-slate-200 dark:border-slate-800 text-center transition-colors duration-300",
      tpl: `
        <div>
            <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ready to reshape your workflow?</h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">Join the future of frontend development today.</p>
            <div class="flex justify-center gap-4 text-slate-400">
                <i class="fa fa-twitter hover:text-blue-400 cursor-pointer transition"></i>
                <i class="fa fa-github hover:text-slate-800 dark:hover:text-white cursor-pointer transition"></i>
                <i class="fa fa-youtube hover:text-red-500 cursor-pointer transition"></i>
            </div>
            <p class="text-slate-400 text-sm mt-8">© 2026 CopilotKit Amis Agent. All rights reserved.</p>
        </div>
       `,
    },
  ],
};

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

function AmisAgentChat() {
  const { theme } = { theme: "light" }; // Simple theme mock or use a real hook if available

  useCoAgentStateRender<AmisAgentState>({
    name: "AmisEditorPageAgent",
    render: ({ state }) => {
      if (!state.tasks || state.tasks.length === 0) {
        return null;
      }

      const completedCount = state.currentTaskIndex || 0;
      const progressPercentage = (completedCount / state.tasks.length) * 100;

      // Calculate active task
      const activeTaskIndex = state.currentTaskIndex ?? 0;

      return (
        <div className="flex flex-col gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm mt-4">
          {/* Re-use the TaskProgressCard logic or component here if possible, 
               but since TaskProgressCard takes props, we can just use it! 
           */}
          <TaskProgressCard
            tasks={state.tasks}
            currentTaskIndex={state.currentTaskIndex || 0}
          />

          <FinalResultCard
            schema={state.schema || {}}
            executionLog={state.executionLog}
          />
        </div>
      );
    },
  });

  return (
    <CopilotSidebar
      className="h-full w-full"
      labels={{
        initial:
          "Hi, I'm your Amis AI Agent! I can help you design and modify this page. Try saying 'Add a login form' or 'Change the title'.",
      }}
      suggestions={[
        {
          title: "Create Form",
          message: `{
    "platformWorksNumDist": {"youtube":45,"tiktok":20,"ins":1356},
    "platformInteractiveDist": {"youtube":12930,"tiktok":13818,"ins":1537641},
    "platformAccountNumDist": {"youtube":19,"tiktok":14,"ins":591},
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
            }
        }
    }
} 帮我生成报告并且分析`,
        },
        {
          title: "Modify Style",
          message: "make the form use horizontal layout",
        },
      ]}
    />
  );
}

function ThemeSwitcher({
  current,
  onChange,
}: {
  current: string;
  onChange: (v: any) => void;
}) {
  return (
    <div className="absolute top-6 right-6 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 p-1.5 rounded-full flex gap-1 shadow-xl transition-all">
      <button
        onClick={() => onChange("light")}
        className={`p-2 rounded-full transition-all ${current === "light" ? "bg-violet-100 text-violet-600 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun size={18} />
      </button>
      <button
        onClick={() => onChange("dark")}
        className={`p-2 rounded-full transition-all ${current === "dark" ? "bg-violet-100 text-violet-600 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => onChange("system")}
        className={`p-2 rounded-full transition-all ${current === "system" ? "bg-violet-100 text-violet-600 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        title="System"
        aria-label="Follow system theme"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
}

export default function AmisEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const microAppRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    "system",
  );

  // 在客户端挂载时从 localStorage 恢复用户偏好
  useEffect(() => {
    try {
      const saved = localStorage.getItem("amis-theme") as
        | "light"
        | "dark"
        | "system"
        | null;
      if (saved) setThemeMode(saved);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const isSystemDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const shouldBeDark =
        themeMode === "dark" || (themeMode === "system" && isSystemDark);

      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    // 持久化用户选择：如果选择 system，则清除显式存储；否则保存选择
    try {
      if (themeMode === "system") {
        localStorage.removeItem("amis-theme");
      } else {
        localStorage.setItem("amis-theme", themeMode);
      }
    } catch (e) {
      // ignore
    }

    if (themeMode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, [themeMode]);

  // 使用 useCoAgent 连接到 AmisEditorPageAgent
  const { state, setState } = useCoAgent<AmisAgentState>({
    name: "AmisEditorPageAgent",
    initialState: {
      tasks: [],
      currentTaskIndex: 0,
      executionLog: [],
      schema: DEFAULT_SCHEMA,
      userRequirement: "",
    },
  });
  console.log(state);

  useCopilotReadable({
    description: "当前 amis 页面 schema",
    value: state.schema || DEFAULT_SCHEMA,
  });

  useFrontendTool(
    {
      name: "updateAmisSchema",
      description: "更新 amis 页面配置 schema",
      parameters: [
        {
          name: "schema",
          type: "object",
          required: true,
        },
      ],
      handler: async ({ schema }: { schema: object }) => {
        const nextSchema = schema as Record<string, unknown>;
        updateSchema(nextSchema);
        return "schema 已更新";
      },
    },
    [state],
  );

  // 监听 agent 状态变化（用于调试和 UI 更新）
  const ref = useRef<AmisInstance | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化 amis
  useEffect(() => {
    if (sdkReady && isClient && containerRef.current && !window.amisScoped) {
      const amis = window.amisRequire("amis/embed");
      ref.current = amis.embed(
        containerRef.current,
        state.schema || DEFAULT_SCHEMA,
      );
    }
  }, [sdkReady, isClient]);

  useEffect(() => {
    if (state.schema) {
      updateSchema(state.schema as Record<string, unknown>);
    }
  }, [state.schema]);

  // 当 schema 更新时重新渲染
  function updateSchema(newSchema: Record<string, unknown>) {
    console.log("准备更新 schema:", newSchema);
    if (ref.current && typeof ref.current.updateSchema === "function") {
      try {
        ref.current.updateSchema(newSchema);
        console.log("✅ Schema 更新成功");
      } catch (error) {
        console.error("❌ Schema 更新失败:", error);
      }
    } else {
      console.warn("⚠️ amis 实例未就绪或 updateSchema 方法不可用");
    }
  }

  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
        Loading Editor...
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="/amis/sdk.css" />
      <link rel="stylesheet" href="/amis/helper.css" />
      <link rel="stylesheet" href="/amis/iconfont.css" />

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

      <main className="relative flex">
        <div className="flex-1 h-full relative z-0">
          <div
            ref={containerRef}
            id="amis-app-container"
            className="h-full w-full"
          />
          <AmisAgentChat />
          <ThemeSwitcher current={themeMode} onChange={setThemeMode} />
        </div>

        {/* Custom Sidebar / Chat Area */}
        {/* <div className="w-[450px] h-full border-l border-gray-200 bg-white z-10 shadow-xl flex-shrink-0"> */}

        {/* </div> */}
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

/**
 * 任务进度卡片组件
 * 用于显示任务规划和执行进度
 */
import { Check, Clock, Loader2 } from "lucide-react";

function TaskProgressCard({
  tasks,
  currentTaskIndex,
}: {
  tasks: Task[];
  currentTaskIndex: number;
}) {
  if (!tasks || tasks.length === 0) return null;

  const completedCount = currentTaskIndex;
  const progressPercentage = (completedCount / tasks.length) * 100;
  // 简化的 theme 处理，默认 light
  const theme: string = "light";
  // const theme: "light" | "dark" = "light";

  return (
    <div className="flex">
      <div
        data-testid="task-progress"
        className={`relative rounded-xl w-full p-6 shadow-lg backdrop-blur-sm overflow-hidden ${
          theme === "dark"
            ? "bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50 shadow-2xl"
            : "bg-linear-to-br from-white via-gray-50 to-white text-gray-800 border border-gray-200/80"
        }`}
      >
        {/* Header */}
        <div className="mb-5 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Task Progress
            </h3>
            <div
              className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}
            >
              {completedCount}/{tasks.length} Complete
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className={`relative h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}
          >
            <div
              className="absolute top-0 left-0 h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className={`absolute top-0 left-0 h-full w-full bg-linear-to-r from-transparent to-transparent animate-pulse ${
                theme === "dark" ? "via-white/20" : "via-white/40"
              }`}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2 relative z-10">
          {tasks.map((task, index) => {
            const isCompleted = index < currentTaskIndex;
            const isCurrentPending = index === currentTaskIndex;
            // const isFuturePending = index > currentTaskIndex; // unused

            return (
              <div
                key={task.id || index}
                className={`relative flex items-center p-2.5 rounded-lg transition-all duration-500 ${
                  isCompleted
                    ? theme === "dark"
                      ? "bg-linear-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30"
                      : "bg-linear-to-r from-green-50 to-emerald-50 border border-green-200/60"
                    : isCurrentPending
                      ? theme === "dark"
                        ? "bg-linear-to-r from-blue-900/40 to-purple-900/30 border border-blue-500/50 shadow-lg shadow-blue-500/20"
                        : "bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200/60 shadow-md shadow-blue-200/50"
                      : theme === "dark"
                        ? "bg-slate-800/50 border border-slate-600/30"
                        : "bg-gray-50/50 border border-gray-200/60"
                }`}
              >
                {/* Connector Line */}
                {index < tasks.length - 1 && (
                  <div
                    className={`absolute left-5 top-full w-0.5 h-2 bg-linear-to-b ${
                      theme === "dark"
                        ? "from-slate-500 to-slate-600"
                        : "from-gray-300 to-gray-400"
                    }`}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                    isCompleted
                      ? theme === "dark"
                        ? "bg-linear-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                        : "bg-linear-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200"
                      : isCurrentPending
                        ? theme === "dark"
                          ? "bg-linear-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                          : "bg-linear-to-br from-blue-500 to-purple-600 shadow-md shadow-blue-200"
                        : theme === "dark"
                          ? "bg-slate-700 border border-slate-600"
                          : "bg-gray-300 border border-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isCurrentPending ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div
                    data-testid="task-step-text"
                    className={`font-semibold transition-all duration-300 text-sm ${
                      isCompleted
                        ? theme === "dark"
                          ? "text-green-300"
                          : "text-green-700"
                        : isCurrentPending
                          ? theme === "dark"
                            ? "text-blue-300 text-base"
                            : "text-blue-700 text-base"
                          : theme === "dark"
                            ? "text-slate-400"
                            : "text-gray-500"
                    }`}
                  >
                    {task.description}
                  </div>
                  {isCurrentPending && (
                    <div
                      className={`text-sm mt-1 animate-pulse ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Processing...
                    </div>
                  )}
                  {isCompleted && task.result && (
                    <details className="mt-1">
                      <summary className="text-xs text-green-600 cursor-pointer hover:underline">
                        查看结果
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-auto max-h-24">
                        {JSON.stringify(task.result, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                {/* Animated Background for Current Step */}
                {isCurrentPending && (
                  <div
                    className={`absolute inset-0 rounded-lg bg-linear-to-r animate-pulse ${
                      theme === "dark"
                        ? "from-blue-500/10 to-purple-500/10"
                        : "from-blue-100/50 to-purple-100/50"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Decorative Elements */}
        <div
          className={`absolute top-3 right-3 w-16 h-16 rounded-full blur-xl ${
            theme === "dark"
              ? "bg-linear-to-br from-blue-500/10 to-purple-500/10"
              : "bg-linear-to-br from-blue-200/30 to-purple-200/30"
          }`}
        />
        <div
          className={`absolute bottom-3 left-3 w-12 h-12 rounded-full blur-xl ${
            theme === "dark"
              ? "bg-linear-to-br from-green-500/10 to-emerald-500/10"
              : "bg-linear-to-br from-green-200/30 to-emerald-200/30"
          }`}
        />
      </div>
    </div>
  );
}

/**
 * 最终结果卡片组件
 * 用于显示生成的 amis JSON 配置
 */
function FinalResultCard({
  schema,
  executionLog,
}: {
  schema: object;
  executionLog?: ExecutionEvent[];
}) {
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
  };

  const handleApplySchema = () => {
    // 触发自定义事件来应用 schema
    window.dispatchEvent(
      new CustomEvent("apply-amis-schema", { detail: schema }),
    );
  };

  return (
    <div className="bg-linear-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 mb-3 shadow-lg">
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
            {JSON.stringify(schema, null, 2)}
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
