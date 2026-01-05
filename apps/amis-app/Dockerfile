# 使用 Node 16 镜像
FROM node:16-alpine

# 安装 git
RUN apk add --no-cache git

WORKDIR /app

# 1. 优先复制 package.json 以利用缓存
COPY apps/amis-app/package.json ./

# 2. 使用 npm 缓存挂载
RUN --mount=type=cache,target=/root/.npm npm install

# 3. 复制源码
COPY apps/amis-app ./

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "start"]
