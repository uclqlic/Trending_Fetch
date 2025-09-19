#!/bin/bash

echo "=== Railway 部署脚本 ==="
echo ""
echo "请按照以下步骤操作："
echo ""
echo "1. 首先登录 Railway（会打开浏览器）："
echo "   运行: railway login"
echo ""
echo "2. 登录成功后，初始化项目："
echo "   运行: railway init"
echo "   - 选择 'Empty Project' 或连接 GitHub 仓库"
echo ""
echo "3. 部署项目："
echo "   运行: railway up"
echo ""
echo "4. 获取部署 URL："
echo "   运行: railway open"
echo ""
echo "=== 一键执行版本 ==="
echo "如果已经登录，可以运行以下命令："
echo ""

read -p "是否已经登录 Railway？(y/n): " logged_in

if [ "$logged_in" = "y" ]; then
    echo "初始化 Railway 项目..."
    railway init

    echo "部署到 Railway..."
    railway up

    echo "获取部署信息..."
    railway status

    echo ""
    echo "部署完成！使用 'railway open' 打开项目控制台"
    echo "使用 'railway logs' 查看日志"
else
    echo "请先运行 'railway login' 登录"
    railway login
    echo "登录后重新运行此脚本"
fi