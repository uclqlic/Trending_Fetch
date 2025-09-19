# HOTS热搜API部署指南

## 快速部署

### 方法1：使用Docker（推荐）

1. 确保已安装Docker和Docker Compose
2. 运行部署脚本：
```bash
./deploy.sh
# 选择选项1 - Docker部署
```

3. 或手动执行：
```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方法2：直接运行

需要先安装Go环境（1.23.5+）

```bash
# 安装依赖
go mod download

# 运行服务
go run cmd/api/main.go

# 或编译后运行
go build -o hots-api cmd/api/main.go
./hots-api
```

### 方法3：系统服务（Linux）

```bash
# 编译程序
go build -o hots-api cmd/api/main.go

# 复制到系统目录
sudo cp hots-api /opt/hots-api/
sudo cp systemd/hots-api.service /etc/systemd/system/

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable hots-api
sudo systemctl start hots-api

# 查看状态
sudo systemctl status hots-api
```

## API访问

服务启动后，可通过以下地址访问：

- 基础地址: `http://localhost:8081`
- API格式: `/api/hot/{平台名}`

### 支持的平台接口

| 平台 | 接口路径 |
|------|---------|
| 微博 | `/api/hot/weibo` |
| B站 | `/api/hot/bili` |
| 抖音 | `/api/hot/douyin` |
| 知乎 | `/api/hot/zhihu/v2` |
| 头条 | `/api/hot/toutiao` |
| 小红书 | `/api/hot/xhs` |
| 豆瓣 | `/api/hot/douban` |
| 百度 | `/api/hot/baidu` |
| 36氪 | `/api/hot/36kr` |
| CSDN | `/api/hot/csdn` |
| 掘金 | `/api/hot/juejin` |
| IT之家 | `/api/hot/ithome` |

## 在Web项目中使用

### 1. HTML直接调用

打开 `examples/web-integration.html` 查看完整示例

```javascript
// 简单示例
fetch('http://localhost:8081/api/hot/weibo')
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            console.log('热搜数据:', data.data);
        }
    });
```

### 2. 使用JavaScript客户端

```javascript
// 引入客户端库
const HotsAPIClient = require('./examples/api-client.js');

// 创建实例
const client = new HotsAPIClient('http://localhost:8081');

// 获取热搜
client.getHotList('weibo').then(data => {
    console.log(data);
});
```

### 3. React组件集成

```jsx
import HotSearchComponent from './examples/react-component.jsx';

function App() {
    return (
        <HotSearchComponent apiUrl="http://localhost:8081" />
    );
}
```

## 配置说明

### 修改端口

编辑 `cmd/api/main.go` 第27行：
```go
endPoint := fmt.Sprintf("0.0.0.0:%d", 8081)  // 改为你需要的端口
```

### 配置Nginx反向代理

使用提供的 `nginx.conf` 配置文件，可以：
- 配置域名访问
- 添加HTTPS支持
- 负载均衡多个实例

### 跨域配置

API已内置CORS支持，默认允许所有域名访问。如需限制，修改 `routers/middlewares/cors.go`

## 性能优化

- 内置2分钟缓存机制，减少对源站压力
- 支持并发请求处理
- 建议配合CDN使用以提高访问速度

## 故障排查

1. **端口占用**
   ```bash
   # 检查8081端口
   lsof -i :8081
   ```

2. **查看日志**
   - Docker: `docker-compose logs -f`
   - 直接运行: 查看控制台输出
   - 系统服务: `journalctl -u hots-api -f`

3. **测试API**
   ```bash
   curl http://localhost:8081/api/hot/weibo
   ```

## 安全建议

1. 生产环境建议使用HTTPS
2. 配置API访问限流
3. 使用防火墙限制访问来源
4. 定期更新依赖包

## 更新维护

```bash
# 更新代码
git pull

# 重新部署
docker-compose down
docker-compose up -d --build
```

## 联系支持

如有问题，请参考原始README.md中的联系方式。