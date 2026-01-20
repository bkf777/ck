# Stage 1: Build
FROM node:20-alpine AS builder

# 安装 pnpm 和 git
RUN apk add --no-cache git && npm install -g pnpm

WORKDIR /app

# 复制工作区定义和 lock 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/agent/package.json ./apps/agent/

# 安装依赖
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter agent...

# 复制源码
COPY apps/agent ./apps/agent

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 安装 pnpm 和生产依赖
RUN npm install -g pnpm

# 复制应用文件
COPY --from=builder /app/apps/agent ./apps/agent
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

WORKDIR /app/apps/agent

# 安装 LangGraph CLI
RUN pnpm add -g @langchain/langgraph-cli

EXPOSE 8123

# 运行 LangGraph 服务
CMD ["npx", "@langchain/langgraph-cli", "dev", "--port", "8123", "--host", "0.0.0.0"]
