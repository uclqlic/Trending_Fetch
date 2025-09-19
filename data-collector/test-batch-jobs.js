require('dotenv').config();
const DataCollector = require('./src/services/collector');
const BatchJobService = require('./src/services/batchJobService');
const logger = require('./src/config/logger');

async function testBatchJobs() {
  console.log('Testing batch jobs functionality...\n');

  const batchJobService = new BatchJobService();

  try {
    // 测试1: 创建批次任务
    console.log('1. Testing batch job creation...');
    const job = await batchJobService.createBatchJob('test_collection', ['baidu', 'weibo']);
    console.log('✅ Created batch job:', job.id);
    console.log('   Status:', job.status);
    console.log('   Job type:', job.job_type);
    console.log('');

    // 测试2: 更新批次任务状态
    console.log('2. Testing batch job status update...');
    await batchJobService.startBatchJob(job.id);
    const startedJob = await batchJobService.getBatchJob(job.id);
    console.log('✅ Updated job status to:', startedJob.status);
    console.log('');

    // 测试3: 更新平台进度
    console.log('3. Testing platform progress update...');
    await batchJobService.updatePlatformProgress(job.id, 'baidu', 50, {
      baidu_status: 'success',
      baidu_duration: 1234
    });
    const progressJob = await batchJobService.getBatchJob(job.id);
    console.log('✅ Updated platform progress:');
    console.log('   Platforms processed:', progressJob.platforms_processed);
    console.log('   Total items:', progressJob.total_items);
    console.log('   Metadata:', JSON.stringify(progressJob.metadata, null, 2));
    console.log('');

    // 测试4: 完成批次任务
    console.log('4. Testing batch job completion...');
    await batchJobService.completeBatchJob(job.id, {
      total: 2,
      success: 1,
      failed: 1,
      totalItems: 50
    });
    const completedJob = await batchJobService.getBatchJob(job.id);
    console.log('✅ Completed batch job:');
    console.log('   Status:', completedJob.status);
    console.log('   Completed at:', completedJob.completed_at);
    console.log('');

    // 测试5: 获取最近的批次任务
    console.log('5. Testing recent batch jobs retrieval...');
    const recentJobs = await batchJobService.getRecentBatchJobs('test_collection', 5);
    console.log('✅ Found', recentJobs.length, 'recent test_collection jobs');
    console.log('');

    // 测试6: 实际数据收集与批次记录
    console.log('6. Testing actual data collection with batch recording...');
    console.log('This will collect data from configured platforms and record in batch_jobs table.');
    console.log('Starting collection...\n');

    const collector = new DataCollector();

    // 只收集单个平台进行测试
    const testPlatforms = ['baidu'];
    collector.platforms = testPlatforms;

    const result = await collector.collectAll();

    console.log('✅ Collection completed with batch job ID:', result.batchJobId);
    console.log('   Total platforms:', result.total);
    console.log('   Successful:', result.success);
    console.log('   Failed:', result.failed);
    console.log('   Total items collected:', result.totalItems);
    console.log('');

    // 验证批次记录
    if (result.batchJobId) {
      const collectionJob = await batchJobService.getBatchJob(result.batchJobId);
      console.log('7. Verifying batch job record...');
      console.log('✅ Batch job details:');
      console.log('   ID:', collectionJob.id);
      console.log('   Type:', collectionJob.job_type);
      console.log('   Status:', collectionJob.status);
      console.log('   Platforms processed:', collectionJob.platforms_processed);
      console.log('   Total items:', collectionJob.total_items);
      console.log('   Started at:', collectionJob.started_at);
      console.log('   Completed at:', collectionJob.completed_at);
      console.log('   Metadata summary:', {
        total: collectionJob.metadata?.total,
        success: collectionJob.metadata?.success,
        failed: collectionJob.metadata?.failed
      });
    }

    console.log('\n✅ All batch job tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// 运行测试
testBatchJobs().then(() => {
  console.log('\nTest completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});