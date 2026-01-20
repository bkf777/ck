import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // 同样建议忽略构建时的类型检查，因为某些第三方库可能存在类型定义不匹配
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@copilotkit/runtime"],
  transpilePackages: [
    "antd",
    "@designable/core",
    "@designable",
    "@designable/react",
    "@designable/react-settings-form",
    "@designable/formily-antd",
    "@designable/formily-setters",
    "@ant-design/icons",
    "amis",
    "amis-editor",
    "amis-ui",
    "amis-core",
    "amis-formula",
    "@ag-ui/langgraph",
    "@ag-ui/client",
    "@ag-ui/core",
  ],
  webpack: (config) => {
    config.devtool =
      process.env.NODE_ENV === "production" ? false : "source-map";
    return config;
  },
};
export default nextConfig;
