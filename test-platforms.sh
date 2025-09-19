#!/bin/bash

# Test all platforms to see which ones are available from the Go API
API_BASE="https://hots-api-production.up.railway.app/api/hot"

echo "Testing available platforms from Go API:"
echo "========================================"

# Test platforms that might be available
platforms=("baidu" "toutiao" "douban" "xhs" "36kr" "juejin" "ithome" "zhihu" "zhihu/v2" "bili" "bilibili" "douyin" "weibo")

for platform in "${platforms[@]}"; do
    echo -n "Testing $platform: "
    response=$(curl -s "${API_BASE}/${platform}")

    # Check if response contains code:0 (successful)
    if echo "$response" | grep -q '"code":0'; then
        echo "✅ Available"
    elif echo "$response" | grep -q "404"; then
        echo "❌ Not found (404)"
    else
        # Try to extract error message
        if echo "$response" | grep -q '"code"'; then
            code=$(echo "$response" | grep -o '"code":[^,}]*' | cut -d':' -f2)
            echo "⚠️ Available but error (code: $code)"
        else
            echo "❌ Error or unavailable"
        fi
    fi
done
