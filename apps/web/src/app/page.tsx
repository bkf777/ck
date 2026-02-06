"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Sun, Moon, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAmisSdk } from "../hooks/use-amis-sdk";

type AmisInstance = {
  updateSchema: (schema: Record<string, unknown>) => void;
  updateProps: (props: Record<string, unknown>) => void;
};

// 声明全局类型
declare global {
  interface Window {
    amisRequire?: any;
    amisScoped?: any;
  }
}

export default function AmisEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const sdkReady = useAmisSdk();
  const ref = useRef<AmisInstance | null>(null);

  const router = useRouter();

  const DEFAULT_SCHEMA = useMemo(
    () => ({
      type: "page",
      // title: "AI Low-Code Introduction",
      className:
        "bg-white dark:bg-slate-950 font-sans h-full transition-colors duration-300",
      cssVars: {
        "--primary": "#6366f1",
        "--primary-onHover": "#4f46e5",
        "--text-color": "#1f2937",
        "--button-size-default-height": "3rem",
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
              type: "container",
              className: "relative z-10 text-center max-w-4xl mx-auto px-4",
              body: [
                {
                  type: "plain",
                  className:
                    "inline-block mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 font-semibold text-sm border border-violet-200 shadow-sm",
                  text: "✨ Next Generation UI Builder",
                },
                {
                  type: "container",
                  className:
                    "text-5xl md:text-7xl font-extrabold tracking-tight !text-amber-200 dark:text-white mb-6 leading-tight",
                  body: [
                    { type: "plain", text: "Build ", inline: true },
                    {
                      type: "plain",
                      text: "Amis Pages",
                      className:
                        "bg-clip-text !text-transparent !bg-gradient-to-r !from-violet-600 !via-fuchsia-500 !to-pink-500",
                      inline: true,
                    },
                    { type: "html", html: "<br/>", inline: true },
                    {
                      type: "plain",
                      text: "with ",
                      className: "text-slate-700 dark:text-slate-200",
                      inline: true,
                    },
                    {
                      type: "plain",
                      text: "Natural Language",
                      className:
                        "italic font-serif text-slate-700 dark:text-slate-200",
                      inline: true,
                    },
                  ],
                },
                {
                  type: "plain",
                  className:
                    "text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed block",
                  text: "Describe your dream interface, and watch our AI agent instantly weave it into reality. No complex coding required—just pure creativity.",
                },
                {
                  type: "flex",
                  justify: "center",
                  className: "gap-4",
                  items: [
                    {
                      type: "button",
                      label: "Start Building",
                      className:
                        "px-8 py-4 !bg-gradient-to-r h-auto! !from-violet-600 !to-fuchsia-600 !text-white rounded-xl font-bold text-lg shadow-xl shadow-violet-200 dark:shadow-none hover:shadow-2xl hover:scale-105 transition-all transform flex items-center gap-2 !border-transparent",
                      icon: "fa fa-arrow-right",
                      iconClassName: "ml-2",
                      onClick: () => {
                        router.push("/amis-editor");
                      },
                    },
                    {
                      type: "button",
                      label: "Watch Demo",
                      className:
                        "px-8 py-4 !bg-white h-auto! dark:!bg-slate-800 !text-slate-700 dark:!text-slate-200 !border !border-slate-200 dark:!border-slate-700 rounded-xl font-bold text-lg hover:!bg-slate-50 dark:hover:!bg-slate-750 transition-all shadow-sm hover:shadow-md flex items-center gap-2",
                      icon: "fa fa-play-circle text-violet-500",
                      onEvent: {
                        click: {
                          actions: [
                            {
                              actionType: "url",
                              args: {
                                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                blank: true,
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
            // Decorative Blobs - Optimized for performance (static gradients, no heavy blur/animation)
            {
              type: "container",
              className:
                "absolute top-0 left-0 w-96 h-96 bg-purple-300/30 dark:bg-purple-900/20 rounded-full",
              body: [],
            },
            {
              type: "container",
              className:
                "absolute top-0 right-0 w-96 h-96 bg-yellow-300/30 dark:bg-blue-900/20 rounded-full",
              body: [],
            },
            {
              type: "container",
              className:
                "absolute -bottom-8 left-20 w-96 h-96 bg-pink-300/30 dark:bg-fuchsia-900/20 rounded-full",
              body: [],
            },
          ],
        },

        // Features Grid
        {
          type: "wrapper",
          className: "py-20 px-4 max-w-7xl mx-auto",
          body: [
            {
              type: "container",
              className: "text-center mb-16",
              body: [
                {
                  type: "plain",
                  text: "Why Choose AI Low-Code?",
                  className:
                    "text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 block",
                },
                {
                  type: "plain",
                  text: "Experience the perfect fusion of development speed and design flexibility.",
                  className:
                    "text-slate-500 dark:text-slate-400 max-w-2xl mx-auto block",
                },
              ],
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
                          type: "flex",
                          direction: "column",
                          justify: "center",
                          alignItems: "center",
                          className: "h-full text-center",
                          items: [
                            {
                              type: "container",
                              className:
                                "w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 group-hover:scale-110 transition-transform",
                              body: [
                                {
                                  type: "html",
                                  html: "<i class='fa fa-magic'></i>",
                                },
                              ],
                            },
                            {
                              type: "plain",
                              text: "Instant Generation",
                              className:
                                "text-xl font-bold text-slate-800 dark:text-white mb-3",
                            },
                            {
                              type: "plain",
                              text: `Turn "Login Form" or "Dashboard" into fully functional code in seconds. The fastest way from idea to UI.`,
                              className:
                                "text-slate-500 dark:text-slate-400 leading-relaxed",
                            },
                          ],
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
                          type: "flex",
                          direction: "column",
                          justify: "center",
                          alignItems: "center",
                          className: "h-full text-center",
                          items: [
                            {
                              type: "container",
                              className:
                                "w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform",
                              body: [
                                {
                                  type: "html",
                                  html: "<i class='fa fa-paint-brush'></i>",
                                },
                              ],
                            },
                            {
                              type: "plain",
                              text: "Adaptive Styling",
                              className:
                                "text-xl font-bold text-slate-800 mb-3",
                            },
                            {
                              type: "plain",
                              text: "Our AI understands aesthetics. It applies modern, beautiful styles using Tailwind and Amis best practices automatically.",
                              className: "text-slate-500 leading-relaxed",
                            },
                          ],
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
                          type: "flex",
                          direction: "column",
                          justify: "center",
                          alignItems: "center",
                          className: "h-full text-center",
                          items: [
                            {
                              type: "container",
                              className:
                                "w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform",
                              body: [
                                {
                                  type: "html",
                                  html: "<i class='fa fa-code'></i>",
                                },
                              ],
                            },
                            {
                              type: "plain",
                              text: "Developer Friendly",
                              className:
                                "text-xl font-bold text-slate-800 mb-3",
                            },
                            {
                              type: "plain",
                              text: "Not just a toy. Export clean, maintainable JSON schema. Seamlessly integrate into your existing Amis projects.",
                              className: "text-slate-500 leading-relaxed",
                            },
                          ],
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
                          className:
                            "bg-white dark:bg-slate-800 rounded-lg p-6",
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
    }),
    [],
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (sdkReady && isClient && containerRef.current && !window.amisScoped) {
      const amis = window.amisRequire("amis/embed");
      ref.current = amis.embed(containerRef.current, DEFAULT_SCHEMA);
    }
  }, [sdkReady, isClient]);

  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
        Loading Editor...
      </div>
    );
  }

  return (
    <>
      <main className="relative flex h-screen w-full overflow-hidden">
        <div className="flex-1 h-full relative z-0">
          <div
            ref={containerRef}
            id="amis-app-container"
            className="h-full w-full"
          />
        </div>
      </main>
    </>
  );
}
