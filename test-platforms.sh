#!/bin/bash

echo "=== 测试各平台API状态 ==="
echo ""

platforms=("weibo" "bili" "douyin" "zhihu/v2" "baidu" "toutiao" "douban" "xhs" "36kr" "csdn" "juejin" "ithome")

for platform in "${platforms[@]}"; do
    response=$(curl -s "http://localhost:8081/api/hot/$platform" 2>/dev/null)

    # 检查是否有数据
    if echo "$response" | grep -q '"data":\[.*\]' && ! echo "$response" | grep -q '"data":\[\]'; then
        echo "✅ $platform: 有数据"
    elif echo "$response" | grep -q '"data":null'; then
        echo "❌ $platform: 无数据 (null)"
    elif echo "$response" | grep -q '"data":\[\]'; then
        echo "⚠️  $platform: 空数组"
    else
        echo "❓ $platform: 未知状态"
    fi
done

echo ""
echo "=== 详细错误信息 ==="
echo ""

# 显示有错误的平台详情
for platform in "weibo" "zhihu/v2"; do
    echo "--- $platform ---"
    curl -s "http://localhost:8081/api/hot/$platform" | python3 -m json.tool | head -10
    echo ""
done