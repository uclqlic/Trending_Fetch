#!/bin/bash

echo "======================================"
echo "完整的平台与数据库表对应关系检查"
echo "======================================"
echo ""

API_BASE="https://hots-api-production.up.railway.app/api/hot"

# 所有可能的平台
platforms=("baidu" "toutiao" "douban" "xhs" "36kr" "juejin" "ithome" "bili" "douyin" "weibo")

echo "平台名 | API状态 | 对应表名"
echo "-------|---------|----------"

for platform in "${platforms[@]}"; do
    printf "%-8s | " "$platform"
    
    # 测试API
    response=$(curl -s "${API_BASE}/${platform}" 2>/dev/null)
    if echo "$response" | grep -q '"code":0'; then
        printf "✅ 可用  | "
    else
        printf "❌ 不可用 | "
    fi
    
    # 显示对应的表名
    echo "trending_$platform"
done

echo ""
echo "======================================"
echo "你的Supabase中需要以下表："
echo "======================================"
for platform in "${platforms[@]}"; do
    echo "- trending_$platform"
done
