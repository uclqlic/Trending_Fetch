# Railway 多服务部署指南

本项目包含两个服务，可以同时部署在Railway上：
1. **hots-api** - Go语言的热点数据API服务
2. **data-collector** - Node.js的数据采集和翻译服务

## 部署步骤

### 方法1：使用Railway CLI（推荐）

#### 1. 安装Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. 登录Railway
```bash
railway login
```

#### 3. 创建新项目
```bash
railway init
# 输入项目名称，例如：hots-services
```

#### 4. 部署Go API服务
```bash
# 在项目根目录
railway up --service hots-api
```

#### 5. 部署数据采集服务
```bash
# 进入data-collector目录
cd data-collector
railway up --service data-collector
```

#### 6. 配置环境变量

在Railway Dashboard中为每个服务配置环境变量：

**hots-api服务：**
```
PORT=8081
GIN_MODE=release
```

**data-collector服务：**
```
# API配置（使用Railway内部网络）
API_BASE_URL=http://hots-api.railway.internal:8081/api/hot

# Supabase配置
SUPABASE_URL=你的Supabase项目URL
SUPABASE_KEY=你的Supabase匿名密钥

# OpenAI配置
OPENAI_API_KEY=你的OpenAI API密钥

# 采集配置
COLLECTION_SCHEDULE=*/15 * * * *
PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo,bili,zhihu

# 环境配置
NODE_ENV=production
LOG_LEVEL=info
```

### 方法2：通过GitHub部署

#### 1. 推送代码到GitHub
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

#### 2. 在Railway Dashboard创建项目

1. 登录 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库

#### 3. 创建两个服务

在Railway项目中：

1. **创建Go API服务：**
   - 点击 "New Service"
   - 选择 "GitHub Repo"
   - Service Name: `hots-api`
   - Root Directory: `/`
   - Start Command: `cd cmd/api && go run main.go`

2. **创建数据采集服务：**
   - 点击 "New Service"
   - 选择 "GitHub Repo"
   - Service Name: `data-collector`
   - Root Directory: `/data-collector`
   - Start Command: `npm start`

#### 4. 配置环境变量

在每个服务的Settings → Variables中添加相应的环境变量。

## 服务间通信

Railway提供内部网络，服务之间可以通过内部域名通信：

- Go API服务内部地址：`http://hots-api.railway.internal:8081`
- 数据采集服务使用此地址访问API

## 验证部署

### 1. 检查Go API服务
访问公开URL（Railway会自动分配），例如：
```
https://hots-api-production.up.railway.app/api/hot/baidu
```

### 2. 查看数据采集日志
在Railway Dashboard中查看data-collector服务的日志，确认：
- 成功连接到Supabase
- 定时任务已启动
- 数据采集正常进行

### 3. 检查数据库
登录Supabase查看：
- `trending_*` 表是否有新数据
- `translations_*` 表是否有翻译数据
- `collection_logs` 表查看采集记录

## 常见问题

### Q: 服务间无法通信
A: 确保使用Railway内部网络地址：`http://服务名.railway.internal:端口`

### Q: 环境变量未生效
A: 在Railway Dashboard中检查Variables设置，修改后需要重新部署

### Q: 定时任务不执行
A: 检查`COLLECTION_SCHEDULE`格式是否正确，查看日志确认cron任务是否启动

### Q: 翻译功能不工作
A: 确认`OPENAI_API_KEY`配置正确，API额度充足

## 监控和维护

1. **查看日志**
   - Railway Dashboard → 选择服务 → Logs

2. **监控资源使用**
   - Railway Dashboard → Metrics

3. **设置告警**
   - 可以集成第三方监控服务

4. **数据备份**
   - 定期备份Supabase数据库
   - 导出重要的采集日志

## 成本优化

1. **调整采集频率**
   - 修改`COLLECTION_SCHEDULE`减少采集次数
   - 例如：`0 */2 * * *`（每2小时一次）

2. **选择性采集**
   - 修改`PLATFORMS`只采集必要的平台

3. **优化翻译**
   - 可以选择性翻译热度高的内容
   - 使用缓存避免重复翻译

## 更新部署

```bash
# 更新Go服务
railway up --service hots-api

# 更新数据采集服务
cd data-collector
railway up --service data-collector
```

或通过GitHub自动部署（推送到main分支）。