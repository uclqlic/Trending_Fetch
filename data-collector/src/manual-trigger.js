#!/usr/bin/env node

/**
 * 手动触发数据采集
 * 使用方法: node src/manual-trigger.js
 */

require('dotenv').config();
const DataCollector = require('./services/collector');
const logger = require('./config/logger');

async function manualRun() {
  logger.info('🚀 Starting manual data collection...');

  const collector = new DataCollector();

  try {
    const result = await collector.collectAll();

    console.log('\n✅ Collection completed!');
    console.log('=====================================');
    console.log(`Total platforms: ${result.total}`);
    console.log(`Successful: ${result.success}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Items collected: ${result.totalItems}`);
    console.log(`Items translated: ${result.totalTranslated}`);
    console.log('=====================================\n');

    // 显示每个平台的结果
    result.results.forEach(r => {
      const status = r.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${r.platform}: ${r.itemsCollected} items, ${r.itemsTranslated} translated`);
    });

  } catch (error) {
    logger.error('Manual collection failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 验证环境变量
const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please configure them in Railway Dashboard or .env file');
  process.exit(1);
}

// 运行采集
manualRun();