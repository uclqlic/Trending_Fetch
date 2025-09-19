const cron = require('node-cron');
const logger = require('./config/logger');
const DataCollector = require('./services/collector');
require('dotenv').config();

// 创建日志目录
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 验证环境变量
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please create a .env file based on .env.example');
    process.exit(1);
  }

  logger.info('Environment validation passed');
}

// 数据采集任务
async function runCollection() {
  logger.info('Starting scheduled data collection');
  const collector = new DataCollector();

  try {
    const result = await collector.collectAll();
    logger.info('Collection completed successfully:', {
      total: result.total,
      success: result.success,
      failed: result.failed,
      items: result.totalItems
    });
  } catch (error) {
    logger.error('Collection failed:', error);
  }
}

// 手动触发采集（用于测试）
async function manualCollection() {
  logger.info('Running manual collection');
  await runCollection();
}

// 主函数
async function main() {
  logger.info('Starting Data Collector Service');

  // 验证环境
  validateEnvironment();

  // 获取调度配置
  const schedule = process.env.COLLECTION_SCHEDULE || '*/15 * * * *'; // 默认每15分钟

  // 如果是开发环境，立即运行一次
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development mode: Running initial collection');
    await manualCollection();
  }

  // 设置定时任务
  logger.info(`Setting up cron schedule: ${schedule}`);
  const task = cron.schedule(schedule, runCollection, {
    scheduled: true,
    timezone: 'Asia/Shanghai' // 使用中国时区
  });

  // 启动任务
  task.start();
  logger.info('Cron task started successfully');

  // 处理进程信号
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    task.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    task.stop();
    process.exit(0);
  });

  // 保持进程运行
  logger.info('Data collector service is running. Press Ctrl+C to stop.');
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 启动应用
main().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});