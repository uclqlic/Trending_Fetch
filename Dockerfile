# 构建阶段
FROM golang:1.23.5-alpine AS builder

WORKDIR /app

# 安装依赖
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 编译程序
RUN CGO_ENABLED=0 GOOS=linux go build -o hots-api cmd/api/main.go

# 运行阶段
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/hots-api .

# 暴露端口
EXPOSE 8081

# 运行程序
CMD ["./hots-api"]