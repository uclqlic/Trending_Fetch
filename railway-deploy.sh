#!/bin/bash

echo "=== Railway 部署脚本 ==="
echo ""

PROJECT_ID="dfd178d3-b486-4d35-acac-6d40cc543177"

echo "步骤 1: 检查登录状态..."
if ! railway whoami &>/dev/null; then
    echo "❌ 未登录 Railway"
    echo "请运行: railway login"
    exit 1
else
    echo "✅ 已登录 Railway"
fi

echo ""
echo "步骤 2: 连接到项目 $PROJECT_ID ..."
railway link -p $PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ 项目已连接"
else
    echo "❌ 连接项目失败"
    exit 1
fi

echo ""
echo "步骤 3: 部署项目..."
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "查看部署状态: railway status"
    echo "查看日志: railway logs"
    echo "打开项目: railway open"

    # 获取部署 URL
    echo ""
    echo "获取部署 URL..."
    railway status
else
    echo "❌ 部署失败"
    exit 1
fi