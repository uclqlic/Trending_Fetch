# 🚀 立即部署到Railway

代码已成功推送到GitHub！现在可以部署到Railway了。

GitHub仓库：https://github.com/uclqlic/Trending_Fetch.git

## 方法1：使用Railway Dashboard（推荐）

### 步骤：

1. **打开Railway网站**
   ```
   https://railway.app
   ```

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 连接GitHub账号（如果还没连接）
   - 选择仓库：`uclqlic/Trending_Fetch`

3. **创建两个服务**

   ### 服务1：Go API (hots-api)
   - 点击 "New Service" → "GitHub Repo"
   - Service Name: `hots-api`
   - Root Directory: `/` （留空即可）
   - 环境变量：
     ```
     PORT=8081
     GIN_MODE=release
     ```

   ### 服务2：数据采集器 (data-collector)
   - 点击 "New Service" → "GitHub Repo"
   - Service Name: `data-collector`
   - Root Directory: `/data-collector`
   - 环境变量：
     ```
     # API配置（使用Railway内部网络）
     API_BASE_URL=http://hots-api.railway.internal:8081/api/hot

     # Supabase配置（必须配置）
     SUPABASE_URL=你的Supabase项目URL
     SUPABASE_KEY=你的Supabase匿名密钥

     # OpenAI配置（用于翻译）
     OPENAI_API_KEY=你的OpenAI API密钥

     # 采集配置
     COLLECTION_SCHEDULE=*/15 * * * *
     PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo,bili,zhihu

     # 环境配置
     NODE_ENV=production
     LOG_LEVEL=info
     ```

4. **部署**
   - Railway会自动开始构建和部署
   - 查看日志确认服务运行正常

## 方法2：使用Railway CLI

在终端执行以下命令：

```bash
# 1. 登录Railway
railway login

# 2. 创建新项目或链接现有项目
railway link

# 3. 部署Go API服务
railway up --service hots-api

# 4. 部署数据采集服务
cd data-collector
railway up --service data-collector

# 5. 配置环境变量
railway variables set API_BASE_URL=http://hots-api.railway.internal:8081/api/hot --service data-collector
railway variables set SUPABASE_URL=你的值 --service data-collector
railway variables set SUPABASE_KEY=你的值 --service data-collector
railway variables set OPENAI_API_KEY=你的值 --service data-collector
```

## 验证部署

### 1. 检查Go API服务
访问Railway分配的公开URL：
```
https://[your-service].railway.app/api/hot/baidu
```

### 2. 查看数据采集日志
在Railway Dashboard查看data-collector服务日志

### 3. 检查Supabase数据
- 查看`trending_*`表是否有新数据
- 查看`translations_*`表是否有翻译数据

## 需要配置的密钥

1. **Supabase**
   - 登录 https://supabase.com
   - 进入你的项目
   - Settings → API → 获取URL和anon key

2. **OpenAI**
   - 登录 https://platform.openai.com
   - API Keys → Create new secret key

## 支持的平台

- **通过Go API采集**：baidu, toutiao, douban, xhs, 36kr, juejin, ithome, bili, zhihu
- **通过RSS采集**：weibo（无需Go API）

## 故障排查

如果遇到问题：

1. **检查环境变量**是否正确配置
2. **查看服务日志**了解错误详情
3. **确认Supabase表结构**已创建
4. **验证API密钥**是否有效

---

💡 **提示**：Railway会自动检测项目类型并构建部署，Go服务和Node.js服务都会自动识别并安装依赖。