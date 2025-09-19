# Batch Jobs 批次任务记录功能

## 功能说明

批次任务记录功能用于追踪每次数据收集的执行情况，包括处理的平台、收集的数据量、执行状态等信息。

## 数据库表结构

在 Supabase 中执行以下 SQL 创建 `batch_jobs` 表：

```sql
CREATE TABLE IF NOT EXISTS public.batch_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NULL DEFAULT 'pending'::VARCHAR,
  platforms_processed TEXT[] NULL,
  total_items INTEGER NULL DEFAULT 0,
  metadata JSONB NULL,
  started_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT batch_jobs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_job_type
ON public.batch_jobs
USING btree (job_type, created_at DESC);
```

## 使用方法

### 1. 配置环境变量

创建 `.env` 文件（可从 `.env.example` 复制）：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 2. 批次记录自动集成

当运行数据收集时，系统会自动：

1. **创建批次任务** - 记录开始时间和计划处理的平台
2. **更新进度** - 每个平台处理完成后更新状态
3. **记录结果** - 保存每个平台的处理结果和统计信息
4. **完成任务** - 记录总体执行结果

### 3. 查看批次记录

在 Supabase Dashboard 中查询批次记录：

```sql
-- 查看最近的批次任务
SELECT * FROM batch_jobs
WHERE job_type = 'data_collection'
ORDER BY created_at DESC
LIMIT 10;

-- 查看成功的批次任务
SELECT * FROM batch_jobs
WHERE status = 'completed'
ORDER BY created_at DESC;

-- 查看处理项目最多的批次
SELECT id, total_items, platforms_processed, created_at
FROM batch_jobs
ORDER BY total_items DESC
LIMIT 10;

-- 查看特定平台的处理情况
SELECT
  id,
  platforms_processed,
  metadata->>'baidu_items' as baidu_items,
  metadata->>'weibo_items' as weibo_items,
  created_at
FROM batch_jobs
WHERE 'baidu' = ANY(platforms_processed)
ORDER BY created_at DESC;
```

## 批次记录数据结构

每个批次任务记录包含：

- **id**: UUID 唯一标识符
- **job_type**: 任务类型（如 `data_collection`）
- **status**: 状态
  - `pending`: 等待执行
  - `in_progress`: 正在执行
  - `completed`: 成功完成
  - `failed`: 执行失败
- **platforms_processed**: 已处理的平台列表
- **total_items**: 总处理项数
- **metadata**: JSON 格式的详细信息
  - 每个平台的处理结果
  - 错误信息（如果有）
  - 执行时间统计
  - 汇总信息

## 测试脚本

### 测试批次记录逻辑（无需数据库）

```bash
node test-batch-logic.js
```

### 测试 Supabase 连接（需要配置 .env）

```bash
node test-supabase-batch.js
```

### 测试完整数据收集流程（需要配置 .env）

```bash
node test-batch-jobs.js
```

## 监控和维护

### 查看批次执行趋势

```sql
-- 按天统计批次执行情况
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(total_items) as avg_items
FROM batch_jobs
WHERE job_type = 'data_collection'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 清理旧记录

```sql
-- 删除30天前的记录
DELETE FROM batch_jobs
WHERE created_at < NOW() - INTERVAL '30 days';
```

## 集成示例

批次记录功能已自动集成到 `DataCollector` 类中：

```javascript
const DataCollector = require('./src/services/collector');
const collector = new DataCollector();

// 执行数据收集，自动记录批次信息
const result = await collector.collectAll();
console.log('Batch Job ID:', result.batchJobId);
```

## 故障排查

1. **表不存在错误**
   - 确保已在 Supabase 中执行创建表的 SQL

2. **权限错误**
   - 检查 Supabase API Key 是否正确
   - 确认表的 RLS（Row Level Security）设置

3. **连接超时**
   - 检查网络连接
   - 确认 Supabase URL 是否正确

## 相关文件

- `src/services/batchJobService.js` - 批次任务服务模块
- `src/services/collector.js` - 集成批次记录的数据收集器
- `sql/create_batch_jobs_table.sql` - 创建表的 SQL 脚本
- `test-batch-logic.js` - 逻辑测试脚本
- `test-supabase-batch.js` - Supabase 连接测试脚本