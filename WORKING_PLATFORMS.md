# 🟢 正常工作的平台列表

## ✅ 可用平台（9个）

| 平台 | API路径 | 说明 |
|------|---------|------|
| **B站** | `/api/hot/bili` | B站热门视频排行榜 |
| **抖音** | `/api/hot/douyin` | 抖音热搜榜 |
| **百度** | `/api/hot/baidu` | 百度热搜榜 |
| **今日头条** | `/api/hot/toutiao` | 头条热榜 |
| **豆瓣** | `/api/hot/douban` | 豆瓣话题榜 |
| **小红书** | `/api/hot/xhs` | 小红书热搜 |
| **36氪** | `/api/hot/36kr` | 36氪热门文章 |
| **掘金** | `/api/hot/juejin` | 掘金热门文章 |
| **IT之家** | `/api/hot/ithome` | IT之家热门新闻 |

## 📡 API调用示例

### JavaScript调用
```javascript
// 获取B站热搜
fetch('http://localhost:8081/api/hot/bili')
    .then(res => res.json())
    .then(data => {
        if (data.code === 0 && data.data) {
            console.log('B站热搜:', data.data);
        }
    });

// 获取抖音热搜
fetch('http://localhost:8081/api/hot/douyin')
    .then(res => res.json())
    .then(data => {
        if (data.code === 0 && data.data) {
            console.log('抖音热搜:', data.data);
        }
    });
```

### 批量获取示例
```javascript
// 批量获取多个平台数据
const workingPlatforms = [
    'bili',     // B站
    'douyin',   // 抖音
    'baidu',    // 百度
    'toutiao',  // 头条
    'douban',   // 豆瓣
    'xhs',      // 小红书
    '36kr',     // 36氪
    'juejin',   // 掘金
    'ithome'    // IT之家
];

async function getAllHotData() {
    const results = {};

    for (const platform of workingPlatforms) {
        try {
            const response = await fetch(`http://localhost:8081/api/hot/${platform}`);
            const data = await response.json();

            if (data.code === 0 && data.data) {
                results[platform] = data.data;
                console.log(`✅ ${platform}: 获取成功，${data.data.length}条数据`);
            }
        } catch (error) {
            console.error(`❌ ${platform}: 获取失败`, error);
        }
    }

    return results;
}

// 使用
getAllHotData().then(results => {
    console.log('所有热搜数据:', results);
});
```

## 🎯 推荐使用组合

### 1. 综合资讯组合
- **百度** - 全网热搜综合
- **今日头条** - 新闻热点
- **36氪** - 商业科技

### 2. 社交娱乐组合
- **B站** - 年轻人文化
- **抖音** - 短视频热点
- **小红书** - 生活方式
- **豆瓣** - 文艺话题

### 3. 技术开发组合
- **掘金** - 前端/后端技术
- **IT之家** - IT行业新闻

## 📌 注意事项

1. **缓存机制**：API默认缓存2分钟，避免频繁请求
2. **数据格式**：所有平台返回统一格式
   ```json
   {
       "code": 0,        // 0表示成功
       "succ": "ok",     // 成功标识
       "data": [         // 热搜数组
           {
               "title": "标题",
               "desc": "描述",
               "hot_val": "热度值",
               "pos": 1,     // 排名
               "to_url": "链接"
           }
       ]
   }
   ```
3. **跨域支持**：API已启用CORS，可从任何域名调用

## 🚀 快速开始

### 1. 确保服务正在运行
```bash
# Docker方式
docker-compose up -d

# 或直接运行
go run cmd/api/main.go
```

### 2. 测试API是否正常
```bash
curl http://localhost:8081/api/hot/bili
```

## 💻 各种编程语言调用示例

### Python
```python
import requests
import json

# 获取B站热搜
def get_bili_hot():
    url = "http://localhost:8081/api/hot/bili"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        if data['code'] == 0 and data['data']:
            for idx, item in enumerate(data['data'][:10], 1):
                print(f"{idx}. {item['title']} - 热度: {item.get('hot_val', 'N/A')}")
    else:
        print("请求失败")

# 批量获取多个平台
def get_multiple_platforms():
    platforms = ['bili', 'douyin', 'baidu', 'toutiao', 'xhs', 'douban', '36kr', 'juejin', 'ithome']
    all_data = {}

    for platform in platforms:
        url = f"http://localhost:8081/api/hot/{platform}"
        response = requests.get(url)
        if response.status_code == 200:
            all_data[platform] = response.json()

    return all_data

# 使用
get_bili_hot()
```

### Node.js / JavaScript
```javascript
const axios = require('axios');

// 获取抖音热搜
async function getDouyinHot() {
    try {
        const response = await axios.get('http://localhost:8081/api/hot/douyin');

        if (response.data.code === 0 && response.data.data) {
            console.log('抖音热搜Top10:');
            response.data.data.slice(0, 10).forEach((item, index) => {
                console.log(`${index + 1}. ${item.title}`);
            });
        }
    } catch (error) {
        console.error('获取失败:', error.message);
    }
}

// 使用Promise.all并行获取
async function getAllPlatformsParallel() {
    const platforms = ['bili', 'douyin', 'baidu', 'xhs', 'toutiao', 'douban', '36kr', 'juejin', 'ithome'];

    const promises = platforms.map(platform =>
        axios.get(`http://localhost:8081/api/hot/${platform}`)
            .then(res => ({ platform, data: res.data }))
            .catch(err => ({ platform, error: err.message }))
    );

    const results = await Promise.all(promises);
    return results;
}
```

### React组件示例
```jsx
import React, { useState, useEffect } from 'react';

function HotSearchWidget() {
    const [hotData, setHotData] = useState([]);
    const [platform, setPlatform] = useState('bili');
    const [loading, setLoading] = useState(false);

    const platforms = [
        { key: 'bili', name: 'B站' },
        { key: 'douyin', name: '抖音' },
        { key: 'baidu', name: '百度' },
        { key: 'xhs', name: '小红书' },
        { key: 'toutiao', name: '今日头条' },
        { key: 'douban', name: '豆瓣' },
        { key: '36kr', name: '36氪' },
        { key: 'juejin', name: '掘金' },
        { key: 'ithome', name: 'IT之家' }
    ];

    useEffect(() => {
        fetchHotData(platform);
    }, [platform]);

    const fetchHotData = async (platformKey) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8081/api/hot/${platformKey}`);
            const data = await res.json();

            if (data.code === 0 && data.data) {
                setHotData(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div>
                {platforms.map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPlatform(p.key)}
                        style={{
                            margin: '5px',
                            backgroundColor: platform === p.key ? '#1890ff' : '#fff'
                        }}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            <div>
                {loading ? (
                    <p>加载中...</p>
                ) : (
                    <ol>
                        {hotData.slice(0, 10).map((item, idx) => (
                            <li key={idx}>
                                {item.title}
                                {item.hot_val && <span> 🔥{item.hot_val}</span>}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}
```

### Vue 3组件示例
```vue
<template>
  <div class="hot-search">
    <div class="platform-tabs">
      <button
        v-for="p in platforms"
        :key="p.key"
        @click="currentPlatform = p.key"
        :class="{ active: currentPlatform === p.key }"
      >
        {{ p.name }}
      </button>
    </div>

    <div v-if="loading">加载中...</div>
    <ol v-else>
      <li v-for="(item, index) in hotList" :key="index">
        {{ item.title }}
        <span v-if="item.hot_val" class="hot-value">🔥{{ item.hot_val }}</span>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const platforms = [
  { key: 'bili', name: 'B站' },
  { key: 'douyin', name: '抖音' },
  { key: 'baidu', name: '百度' },
  { key: 'xhs', name: '小红书' },
  { key: 'toutiao', name: '今日头条' },
  { key: 'douban', name: '豆瓣' },
  { key: '36kr', name: '36氪' },
  { key: 'juejin', name: '掘金' },
  { key: 'ithome', name: 'IT之家' }
];

const currentPlatform = ref('bili');
const hotList = ref([]);
const loading = ref(false);

const fetchHotData = async (platform) => {
  loading.value = true;
  try {
    const res = await fetch(`http://localhost:8081/api/hot/${platform}`);
    const data = await res.json();

    if (data.code === 0 && data.data) {
      hotList.value = data.data.slice(0, 10);
    }
  } catch (error) {
    console.error('获取失败:', error);
  } finally {
    loading.value = false;
  }
};

watch(currentPlatform, (newPlatform) => {
  fetchHotData(newPlatform);
});

onMounted(() => {
  fetchHotData(currentPlatform.value);
});
</script>
```

### Java (Spring Boot)
```java
import org.springframework.web.client.RestTemplate;
import org.springframework.stereotype.Service;

@Service
public class HotSearchService {

    private final String API_BASE = "http://localhost:8081/api/hot/";
    private final RestTemplate restTemplate = new RestTemplate();

    public HotSearchResponse getHotSearch(String platform) {
        String url = API_BASE + platform;
        return restTemplate.getForObject(url, HotSearchResponse.class);
    }

    public Map<String, HotSearchResponse> getMultiplePlatforms() {
        List<String> platforms = Arrays.asList("bili", "douyin", "baidu", "xhs", "toutiao", "douban", "36kr", "juejin", "ithome");
        Map<String, HotSearchResponse> results = new HashMap<>();

        for (String platform : platforms) {
            try {
                HotSearchResponse response = getHotSearch(platform);
                results.put(platform, response);
            } catch (Exception e) {
                System.err.println("Failed to get " + platform + ": " + e.getMessage());
            }
        }

        return results;
    }
}

// 响应实体类
class HotSearchResponse {
    private int code;
    private String succ;
    private List<HotItem> data;
    // getters and setters
}

class HotItem {
    private String title;
    private String desc;
    private String hot_val;
    private int pos;
    // getters and setters
}
```

### Go
```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

type HotResponse struct {
    Code int       `json:"code"`
    Succ string    `json:"succ"`
    Data []HotItem `json:"data"`
}

type HotItem struct {
    Title  string `json:"title"`
    Desc   string `json:"desc"`
    HotVal string `json:"hot_val"`
    Pos    int    `json:"pos"`
}

func getHotSearch(platform string) (*HotResponse, error) {
    url := fmt.Sprintf("http://localhost:8081/api/hot/%s", platform)

    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var result HotResponse
    err = json.Unmarshal(body, &result)
    if err != nil {
        return nil, err
    }

    return &result, nil
}

func main() {
    // 获取B站热搜
    data, err := getHotSearch("bili")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    if data.Code == 0 && len(data.Data) > 0 {
        fmt.Println("B站热搜Top10:")
        for i, item := range data.Data[:10] {
            fmt.Printf("%d. %s\n", i+1, item.Title)
        }
    }
}
```

### PHP
```php
<?php
// 获取百度热搜
function getBaiduHot() {
    $url = "http://localhost:8081/api/hot/baidu";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($data['code'] == 0 && !empty($data['data'])) {
        echo "百度热搜Top10:\n";
        foreach (array_slice($data['data'], 0, 10) as $index => $item) {
            echo ($index + 1) . ". " . $item['title'] . "\n";
        }
    }
}

// 批量获取
function getMultiplePlatforms() {
    $platforms = ['bili', 'douyin', 'baidu', 'xhs', 'toutiao', 'douban', '36kr', 'juejin', 'ithome'];
    $results = [];

    foreach ($platforms as $platform) {
        $url = "http://localhost:8081/api/hot/{$platform}";
        $response = file_get_contents($url);
        $results[$platform] = json_decode($response, true);
    }

    return $results;
}

// 使用
getBaiduHot();
?>
```

### Shell脚本
```bash
#!/bin/bash

# 获取单个平台数据
get_hot() {
    platform=$1
    curl -s "http://localhost:8081/api/hot/$platform" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['code'] == 0 and data['data']:
    print(f'=== {sys.argv[1]}热搜 ===')
    for i, item in enumerate(data['data'][:10], 1):
        print(f\"{i}. {item['title']}\")
" "$platform"
}

# 批量获取所有平台
get_all() {
    platforms=("bili" "douyin" "baidu" "toutiao" "xhs" "douban" "36kr" "juejin" "ithome")

    for platform in "${platforms[@]}"; do
        echo "正在获取 $platform..."
        get_hot "$platform"
        echo ""
    done
}

# 使用
get_hot "bili"
# 或
# get_all
```

## 🔧 高级用法

### 1. 设置自动刷新
```javascript
// 每2分钟自动刷新（与缓存时间同步）
setInterval(() => {
    fetch('http://localhost:8081/api/hot/bili')
        .then(res => res.json())
        .then(data => updateUI(data));
}, 120000);
```

### 2. 错误处理
```javascript
async function safeGetHotData(platform) {
    try {
        const response = await fetch(`http://localhost:8081/api/hot/${platform}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 0) {
            console.warn(`API返回错误: ${data.err}`);
            return null;
        }

        return data.data;
    } catch (error) {
        console.error(`获取${platform}数据失败:`, error);
        return null;
    }
}
```

### 3. 数据聚合展示
```javascript
// 创建热搜聚合面板
class HotSearchAggregator {
    constructor(apiBase = 'http://localhost:8081') {
        this.apiBase = apiBase;
        this.platforms = ['bili', 'douyin', 'baidu', 'xhs', 'toutiao', 'douban', '36kr', 'juejin', 'ithome'];
    }

    async getAggregatedHot() {
        const allData = await Promise.all(
            this.platforms.map(p => this.fetchPlatform(p))
        );

        // 按热度排序聚合
        const aggregated = [];
        allData.forEach((platformData, index) => {
            if (platformData && platformData.items) {
                platformData.items.slice(0, 3).forEach(item => {
                    aggregated.push({
                        ...item,
                        platform: this.platforms[index]
                    });
                });
            }
        });

        return aggregated.sort((a, b) => {
            const aVal = parseInt(a.hot_val) || 0;
            const bVal = parseInt(b.hot_val) || 0;
            return bVal - aVal;
        });
    }

    async fetchPlatform(platform) {
        try {
            const res = await fetch(`${this.apiBase}/api/hot/${platform}`);
            const data = await res.json();
            return {
                platform,
                items: data.code === 0 ? data.data : []
            };
        } catch {
            return { platform, items: [] };
        }
    }
}
```

## 🔄 更新时间
文档更新于：2024-09-16
测试环境：Docker部署，端口8081