# Supabase 数据库配置文档

## 现有表结构

### Trending 表（热榜数据表）
以下是已存在的trending表：

- `trending_36kr` - 36氪热榜
- `trending_baidu` - 百度热搜
- `trending_bili` - B站热榜
- `trending_douban` - 豆瓣热榜
- `trending_douyin` - 抖音热榜
- `trending_ithome` - IT之家热榜
- `trending_juejin` - 掘金热榜
- `trending_toutiao` - 头条热榜
- `trending_weibo` - 微博热搜
- `trending_xhs` - 小红书热榜

### Translation 表（翻译数据表）
以下是已存在的翻译表：

- `translations_ar` - 阿拉伯语翻译
- `translations_de` - 德语翻译
- `translations_en` - 英语翻译
- `translations_es` - 西班牙语翻译
- `translations_fr` - 法语翻译
- `translations_ja` - 日语翻译
- `translations_ko` - 韩语翻译
- `translations_ru` - 俄语翻译

## SQL 脚本

### 确保所有表的 RLS 都已禁用

```sql
-- 禁用所有 trending 表的 RLS
ALTER TABLE trending_weibo DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_baidu DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_toutiao DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_douban DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_douyin DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_xhs DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_36kr DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_juejin DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_ithome DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_bili DISABLE ROW LEVEL SECURITY;

-- 禁用所有翻译表的 RLS
ALTER TABLE translations_en DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_ja DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_ko DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_es DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_fr DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_de DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_ru DISABLE ROW LEVEL SECURITY;
ALTER TABLE translations_ar DISABLE ROW LEVEL SECURITY;
```

## 平台映射关系

### API 路径 → 数据库表名

| API 路径 | 数据库表名 | 状态 |
|---------|-----------|------|
| `/api/hot/baidu` | `trending_baidu` | ✅ 正常 |
| `/api/hot/toutiao` | `trending_toutiao` | ✅ 正常 |
| `/api/hot/douban` | `trending_douban` | ✅ 正常 |
| `/api/hot/xhs` | `trending_xhs` | ✅ 正常 |
| `/api/hot/36kr` | `trending_36kr` | ✅ 正常 |
| `/api/hot/juejin` | `trending_juejin` | ✅ 正常 |
| `/api/hot/ithome` | `trending_ithome` | ✅ 正常 |
| `/api/hot/bili` | `trending_bili` | ✅ 正常 |
| `/api/hot/douyin` | `trending_douyin` | ✅ 正常 |
| `/api/hot/weibo` | `trending_weibo` | ✅ 正常 |

### 代码中的平台名称映射

现在无需特殊映射，所有平台直接使用 `trending_${platform}` 格式：
- API路径 `/api/hot/bili` → 表名 `trending_bili`
- API路径 `/api/hot/baidu` → 表名 `trending_baidu`
- 以此类推...

## 环境变量配置

在 Railway 中需要配置的环境变量：

```bash
# Supabase 配置
SUPABASE_URL=你的Supabase项目URL
SUPABASE_KEY=你的Supabase服务密钥

# API 配置
API_BASE_URL=https://hots-api-production.up.railway.app/api/hot

# OpenAI 配置（用于翻译，可选）
OPENAI_API_KEY=你的OpenAI API密钥

# 采集平台列表
PLATFORMS=baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo,bili,douyin

# 采集计划（cron格式）
COLLECTION_SCHEDULE=0 8,20 * * *  # 每天8点和20点执行
```

## 注意事项

1. **表名一致性**：确保代码中使用的表名与Supabase中实际的表名完全一致
2. **RLS策略**：所有表都需要禁用RLS或配置适当的策略以允许服务写入
3. **翻译功能**：需要配置OpenAI API密钥才能启用翻译功能
4. **内容去重**：使用content_hash字段确保相同内容不会重复插入