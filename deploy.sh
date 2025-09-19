#!/bin/bash

# 热搜API部署脚本

echo "=========================================="
echo "开始部署 HOTS 热搜聚合API服务"
echo "=========================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    echo "访问 https://docs.docker.com/get-docker/ 获取安装指南"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 选择部署方式
echo ""
echo "请选择部署方式："
echo "1) 使用Docker部署（推荐）"
echo "2) 直接运行Go程序"
echo "3) 编译后台运行"
read -p "请输入选项 (1/2/3): " choice

case $choice in
    1)
        echo "使用Docker部署..."
        # 构建镜像
        docker-compose build

        # 启动服务
        docker-compose up -d

        echo ""
        echo "✅ 服务已启动！"
        echo "API地址: http://localhost:8081"
        echo ""
        echo "查看日志: docker-compose logs -f"
        echo "停止服务: docker-compose down"
        ;;

    2)
        echo "直接运行Go程序..."
        # 检查Go是否安装
        if ! command -v go &> /dev/null; then
            echo "错误: Go未安装，请先安装Go"
            echo "访问 https://golang.org/dl/ 下载Go"
            exit 1
        fi

        # 下载依赖
        go mod download

        # 运行程序
        go run cmd/api/main.go
        ;;

    3)
        echo "编译并后台运行..."
        # 检查Go是否安装
        if ! command -v go &> /dev/null; then
            echo "错误: Go未安装，请先安装Go"
            exit 1
        fi

        # 编译程序
        go build -o hots-api cmd/api/main.go

        # 后台运行
        nohup ./hots-api > hots.log 2>&1 &

        echo ""
        echo "✅ 服务已在后台启动！"
        echo "API地址: http://localhost:8081"
        echo "查看日志: tail -f hots.log"
        echo "停止服务: kill $(pidof hots-api)"
        ;;

    *)
        echo "无效选项"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "部署完成！可以访问以下接口测试："
echo "=========================================="
echo "微博热搜: http://localhost:8081/api/hot/weibo"
echo "B站热搜: http://localhost:8081/api/hot/bili"
echo "知乎热榜: http://localhost:8081/api/hot/zhihu/v2"
echo "抖音热搜: http://localhost:8081/api/hot/douyin"
echo ""