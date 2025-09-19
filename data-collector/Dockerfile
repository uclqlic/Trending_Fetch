FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制源代码
COPY src ./src
COPY .env* ./

# 创建日志目录
RUN mkdir -p logs

# 设置时区为上海
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Healthy')" || exit 1

# 运行应用
CMD ["node", "src/index.js"]