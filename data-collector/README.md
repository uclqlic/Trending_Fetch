# 热点数据采集服务

一个独立的Node.js数据采集服务，定时从Go API服务采集热点数据，存储到Supabase数据库，并自动进行多语言翻译。

## 功能特点

- 🔄 定时自动采集多平台热点数据
- 💾 数据存储到Supabase数据库
- 🌍 支持10种语言自动翻译（使用OpenAI）
- 📊 采集日志记录与监控
- 🐳 Docker容器化部署支持
- ⚡ 增量更新，避免重复数据
- 📡 Weibo数据通过RSS源采集（无需Go API）

## 支持的平台

### 通过Go API采集
- 百度热搜 (baidu)
- 今日头条 (toutiao)
- 豆瓣热门 (douban)
- 小红书 (xhs)
- 36氪 (36kr)
- 掘金 (juejin)
- IT之家 (ithome)
- B站热门 (bili)
- 知乎热榜 (zhihu)

### 通过RSS源采集
- 微博热搜 (weibo) - 使用RSSHub源，无需Go API

## 支持的翻译语言

- 英语 (en)
- 日语 (ja)
- 韩语 (ko)
- 西班牙语 (es)
- 法语 (fr)
- 德语 (de)
- 俄语 (ru)
- 阿拉伯语 (ar)
- 葡萄牙语 (pt)
- 印地语 (hi)

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
cd data-collector

# 安装依赖
npm install

# 复制环境配置文件
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，配置以下必要参数：

```env
# API配置 - Go服务的地址
API_BASE_URL=http://localhost:8081/api/hot

# Supabase配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# OpenAI配置（用于翻译）
OPENAI_API_KEY=your-openai-api-key

# 采集调度（Cron格式）
COLLECTION_SCHEDULE=*/15 * * * *  # 每15分钟执行一次

# 要采集的平台
PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome
```

### 3. 数据库准备

在Supabase中执行以下SQL创建必要的表：

```sql
-- 为每个平台创建trending表
-- 示例：trending_baidu
CREATE TABLE IF NOT EXISTS trending_baidu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  hot_value INTEGER,
  category VARCHAR(100),
  content_hash VARCHAR(32) NOT NULL UNIQUE,
  original_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_baidu_fetched ON trending_baidu(fetched_at DESC);
CREATE INDEX idx_baidu_content ON trending_baidu(content_hash);
CREATE INDEX idx_baidu_rank ON trending_baidu(rank);

-- 为每种语言创建翻译表
-- 示例：translations_en
CREATE TABLE IF NOT EXISTS translations_en (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  content_hash VARCHAR(32) NOT NULL,
  original_title TEXT NOT NULL,
  translated_title TEXT NOT NULL,
  rank INTEGER,
  url TEXT,
  hot_value INTEGER,
  category VARCHAR(100),
  original_data JSONB,
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, content_hash)
);

-- 创建采集日志表
CREATE TABLE IF NOT EXISTS collection_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  items_collected INTEGER DEFAULT 0,
  items_translated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 运行服务

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

## Docker部署

### 使用Docker Compose

1. 构建镜像：
```bash
docker-compose build
```

2. 启动服务：
```bash
docker-compose up -d
```

3. 查看日志：
```bash
docker-compose logs -f data-collector
```

### 单独使用Docker

1. 构建镜像：
```bash
docker build -t hots-data-collector .
```

2. 运行容器：
```bash
docker run -d \
  --name hots-data-collector \
  --restart unless-stopped \
  -e API_BASE_URL=http://hots-api:8081/api/hot \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_KEY=your_supabase_key \
  -e OPENAI_API_KEY=your_openai_key \
  -v $(pwd)/logs:/app/logs \
  hots-data-collector
```

## Railway部署

1. 在Railway创建新服务

2. 设置所有必要的环境变量：
   ```
   # API配置（如果API服务也在Railway，使用内部URL）
   API_BASE_URL=http://hots-api.railway.internal:8081/api/hot

   # Supabase配置（必须）
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key

   # OpenAI配置（用于翻译）
   OPENAI_API_KEY=your-openai-api-key

   # 采集配置
   COLLECTION_SCHEDULE=*/15 * * * *
   PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo,bili,zhihu

   # 其他配置
   NODE_ENV=production
   LOG_LEVEL=info
   ```

3. 部署命令：
```bash
npm ci --only=production
npm start
```

## 架构说明

```
┌─────────────────┐
│   定时调度器     │
└────────┬────────┘
         │
         ├─────────────────┐
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  数据采集服务    │  │  Weibo RSS采集  │
│  (Go API调用)    │  │  (RSSHub源)     │
└────────┬────────┘  └────────┬────────┘
         │                     │
         │◄────────────────────┘
         │
         ▼
┌─────────────────┐
│ Supabase存储    │
│  trending_*表    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   翻译服务      │ ──────► OpenAI API
└────────┬────────┘         (多语言翻译)
         │
         ▼
┌─────────────────┐
│ Supabase存储    │
│translations_*表 │
└─────────────────┘
```

### 数据源说明

- **Go API平台**：通过HTTP请求从Go服务获取数据
- **Weibo平台**：通过RSS源直接获取，支持多个备用源：
  - 主源：`https://rsshub.rssforever.com/weibo/search/hot`
  - 备用：`https://rsshub.app/weibo/search/hot`
  - 备用：`https://rsshub.feeded.xyz/weibo/search/hot`

## 监控与日志

- 日志文件位于 `logs/` 目录
- 采集记录存储在 `collection_logs` 表
- 支持的日志级别：error, warn, info, debug

## API接口说明

服务依赖的Go API接口格式：

```json
GET /api/hot/{platform}

响应格式：
{
  "code": 0,
  "data": [
    {
      "title": "热点标题",
      "hot_val": "123456",
      "desc": "描述",
      "to_url": "链接",
      "pos": 1,
      "lab": "标签",
      "icon": "图标URL"
    }
  ]
}
```

## 故障排查

1. **无法连接到API服务**
   - 检查API_BASE_URL配置
   - 确认Go服务正在运行
   - 如在Docker中运行，确认网络配置

2. **Supabase连接失败**
   - 检查SUPABASE_URL和SUPABASE_KEY
   - 确认表结构已创建

3. **翻译功能不工作**
   - 检查OPENAI_API_KEY配置
   - 确认API额度充足

4. **定时任务不执行**
   - 检查COLLECTION_SCHEDULE格式
   - 查看日志文件获取错误信息

## 性能优化建议

1. 调整采集频率避免过度请求
2. 使用批量翻译减少API调用
3. 实施增量更新策略（已实现）
4. 合理设置日志级别

## License

MIT