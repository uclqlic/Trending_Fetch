# HOTS API 部署指南

## 快速部署选项

### 方案一：Railway（推荐）
最简单快速的部署方式，支持 Docker，有免费层级。

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录 Railway
railway login

# 3. 在项目根目录初始化
railway init

# 4. 部署
railway up

# 5. 获取部署 URL
railway open
```

### 方案二：Render
1. 访问 https://render.com
2. 创建新的 Web Service
3. 选择 Docker 部署方式
4. 设置环境变量：
   - Port: 8081
5. 部署后获得 https://your-app.onrender.com

### 方案三：云服务器（VPS）
适合需要完全控制的场景。

```bash
# 1. 上传代码到服务器
scp -r ./* user@your-server:/opt/hots-api/

# 2. SSH 连接服务器
ssh user@your-server

# 3. 进入项目目录
cd /opt/hots-api

# 4. 构建并运行 Docker
docker-compose up -d

# 5. 配置 Nginx（可选）
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## CORS 配置
确保 API 允许 Vercel 域名访问。在 Go 代码中添加：

```go
import "github.com/gin-contrib/cors"

func main() {
    r := gin.Default()

    config := cors.DefaultConfig()
    config.AllowOrigins = []string{
        "https://your-app.vercel.app",
        "https://*.vercel.app", // 允许所有 Vercel 预览域名
    }
    config.AllowMethods = []string{"GET", "POST", "OPTIONS"}

    r.Use(cors.New(config))
    // ... 其他路由
}
```

## 在 Vercel 项目中使用

在你的 Vercel 项目中配置环境变量：

```javascript
// .env.production
NEXT_PUBLIC_API_URL=https://your-hots-api.railway.app

// 或在 vercel.json
{
  "env": {
    "API_URL": "https://your-hots-api.railway.app"
  }
}
```

使用 API：
```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hot/weibo`);
const data = await response.json();
```

## 推荐顺序
1. **开发测试**：Railway（快速部署，免费层够用）
2. **正式上线**：云服务器（稳定可控）
3. **备选方案**：Render、Fly.io、Google Cloud Run

## 注意事项
- 所有方案都提供 HTTPS
- 记得配置 CORS 允许 Vercel 域名
- 使用环境变量管理 API 地址
- 考虑添加 API 限流保护