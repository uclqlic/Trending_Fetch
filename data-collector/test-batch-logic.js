// 模拟测试批次任务逻辑（不需要实际数据库连接）
const crypto = require('crypto');

class MockBatchJobService {
  constructor() {
    this.jobs = new Map();
  }

  async createBatchJob(jobType, platforms = []) {
    const job = {
      id: crypto.randomUUID(),
      job_type: jobType,
      status: 'pending',
      platforms_processed: [],
      total_items: 0,
      metadata: {
        scheduled_platforms: platforms,
        start_time: new Date().toISOString()
      },
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    this.jobs.set(job.id, job);
    console.log(`✅ Created batch job ${job.id} for ${jobType}`);
    return job;
  }

  async updateBatchJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    Object.assign(job, updates);
    console.log(`✅ Updated batch job ${jobId}:`, updates);
    return job;
  }

  async startBatchJob(jobId) {
    return this.updateBatchJob(jobId, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  async updatePlatformProgress(jobId, platform, items, metadata = {}) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const platformsProcessed = job.platforms_processed || [];
    if (!platformsProcessed.includes(platform)) {
      platformsProcessed.push(platform);
    }

    const totalItems = (job.total_items || 0) + items;
    const updatedMetadata = {
      ...job.metadata,
      [`${platform}_items`]: items,
      [`${platform}_processed_at`]: new Date().toISOString(),
      ...metadata
    };

    return this.updateBatchJob(jobId, {
      platforms_processed: platformsProcessed,
      total_items: totalItems,
      metadata: updatedMetadata
    });
  }

  async completeBatchJob(jobId, summary = {}) {
    const completedAt = new Date().toISOString();
    const job = this.jobs.get(jobId);

    let duration = null;
    if (job && job.started_at) {
      duration = new Date(completedAt) - new Date(job.started_at);
    }

    const metadata = {
      ...job?.metadata,
      ...summary,
      duration_ms: duration,
      completed_time: completedAt
    };

    return this.updateBatchJob(jobId, {
      status: 'completed',
      completed_at: completedAt,
      metadata
    });
  }

  async failBatchJob(jobId, error, partialResults = {}) {
    const job = this.jobs.get(jobId);
    const metadata = {
      ...job?.metadata,
      ...partialResults,
      error_message: error.message || error,
      failed_at: new Date().toISOString()
    };

    return this.updateBatchJob(jobId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      metadata
    });
  }

  async getBatchJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return job;
  }
}

async function testBatchJobLogic() {
  console.log('🧪 Testing Batch Job Service Logic\n');
  console.log('=' .repeat(50));

  const batchService = new MockBatchJobService();

  try {
    // 测试1: 创建批次任务
    console.log('\n📝 Test 1: Creating batch job');
    const job = await batchService.createBatchJob('data_collection', ['baidu', 'weibo', 'douban']);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Scheduled platforms: ${job.metadata.scheduled_platforms.join(', ')}`);

    // 测试2: 启动批次任务
    console.log('\n🚀 Test 2: Starting batch job');
    await batchService.startBatchJob(job.id);
    const startedJob = await batchService.getBatchJob(job.id);
    console.log(`   Status updated to: ${startedJob.status}`);

    // 测试3: 更新平台进度
    console.log('\n📊 Test 3: Updating platform progress');

    // 模拟百度平台完成
    await batchService.updatePlatformProgress(job.id, 'baidu', 50, {
      baidu_status: 'success',
      baidu_translated: 45,
      baidu_duration: 2500
    });
    console.log('   ✅ Baidu: 50 items collected');

    // 模拟微博平台完成
    await batchService.updatePlatformProgress(job.id, 'weibo', 100, {
      weibo_status: 'success',
      weibo_translated: 95,
      weibo_duration: 3200
    });
    console.log('   ✅ Weibo: 100 items collected');

    // 模拟豆瓣平台失败
    await batchService.updatePlatformProgress(job.id, 'douban', 0, {
      douban_status: 'failed',
      douban_error: 'Connection timeout'
    });
    console.log('   ❌ Douban: Failed (Connection timeout)');

    // 测试4: 完成批次任务
    console.log('\n✅ Test 4: Completing batch job');
    const summary = {
      total: 3,
      success: 2,
      failed: 1,
      totalItems: 150,
      totalTranslated: 140
    };

    await batchService.completeBatchJob(job.id, summary);
    const completedJob = await batchService.getBatchJob(job.id);

    console.log(`   Final status: ${completedJob.status}`);
    console.log(`   Platforms processed: ${completedJob.platforms_processed.join(', ')}`);
    console.log(`   Total items: ${completedJob.total_items}`);
    console.log(`   Summary:`, summary);

    // 测试5: 创建并失败一个任务
    console.log('\n❌ Test 5: Handling failed batch job');
    const failedJob = await batchService.createBatchJob('data_collection', ['test']);
    await batchService.startBatchJob(failedJob.id);
    await batchService.failBatchJob(failedJob.id, new Error('Database connection failed'), {
      partial_items: 10
    });
    const failedJobData = await batchService.getBatchJob(failedJob.id);
    console.log(`   Job status: ${failedJobData.status}`);
    console.log(`   Error: ${failedJobData.metadata.error_message}`);

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All tests passed successfully!\n');

    // 显示批次任务记录的数据结构
    console.log('📋 Sample batch job record structure:');
    console.log(JSON.stringify(completedJob, null, 2));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// 运行测试
console.log('Batch Job Service Test - No Database Required');
console.log('This test demonstrates the batch job tracking logic\n');

testBatchJobLogic().then(() => {
  console.log('\n✅ Logic test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});