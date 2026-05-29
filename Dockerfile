# 使用轻量级 Node.js 基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖定义文件
COPY package*.json ./

# 安装生产环境依赖
RUN npm ci --only=production

# 复制应用程序的所有源代码
COPY . .

# 暴露服务器运行的 3000 端口
EXPOSE 3000

# 启动应用程序
CMD ["node", "server.js"]
