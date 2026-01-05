# Stage 1: Build
FROM node:20-alpine AS builder

# 安装 pnpm 和 git
RUN apk add --no-cache git && npm install -g pnpm

WORKDIR /app

# 复制工作区定义和 lock 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/

# 安装依赖
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter web...

# 复制源码
COPY apps/web ./apps/web

# 构建应用
WORKDIR /app/apps/web
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 复制 standalone 构建产物
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 运行 server.js
CMD ["node", "apps/web/server.js"]
