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

# 安装 LangGraph CLI
RUN npm install -g @langchain/langgraph-cli

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 安装 pnpm 和生产依赖
RUN npm install -g pnpm @langchain/langgraph-cli

# 复制应用文件
COPY --from=builder /app/apps/agent ./apps/agent
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

WORKDIR /app/apps/agent

# 创建 .env 文件（从环境变量生成）
RUN echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}" > .env && \
    echo "ANTHROPIC_API_URL=${ANTHROPIC_API_URL:-}" >> .env && \
    echo "LANGSMITH_TRACING=${LANGSMITH_TRACING:-}" >> .env && \
    echo "LANGSMITH_ENDPOINT=${LANGSMITH_ENDPOINT:-}" >> .env && \
    echo "LANGSMITH_API_KEY=${LANGSMITH_API_KEY:-}" >> .env && \
    echo "LANGSMITH_PROJECT=${LANGSMITH_PROJECT:-}" >> .env

EXPOSE 8123

# 运行 LangGraph 服务
CMD ["npx", "@langchain/langgraph-cli", "dev", "--port", "8123", "--host", "0.0.0.0"]
