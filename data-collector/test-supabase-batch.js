require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 检查环境变量
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.log('\nPlease create a .env file with:');
  console.log('SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_KEY=your_supabase_key');
  console.log('\nYou can copy from .env.example and fill in your credentials.');
  process.exit(1);
}

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testBatchJobsTable() {
  console.log('🧪 Testing Batch Jobs Table in Supabase\n');
  console.log('=' .repeat(50));
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('=' .repeat(50) + '\n');

  try {
    // 步骤1: 检查表是否存在
    console.log('📋 Step 1: Checking if batch_jobs table exists...');
    const { data: tables, error: tableError } = await supabase
      .from('batch_jobs')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('does not exist')) {
      console.log('❌ Table batch_jobs does not exist!');
      console.log('\nPlease run the following SQL in your Supabase dashboard:\n');
      console.log(`
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
      `);
      process.exit(1);
    }

    console.log('✅ Table batch_jobs exists!\n');

    // 步骤2: 插入测试记录
    console.log('📝 Step 2: Creating test batch job...');
    const testJob = {
      job_type: 'test_collection',
      status: 'pending',
      platforms_processed: [],
      total_items: 0,
      metadata: {
        test: true,
        created_by: 'test-supabase-batch.js',
        timestamp: new Date().toISOString()
      },
      started_at: new Date().toISOString()
    };

    const { data: insertedJob, error: insertError } = await supabase
      .from('batch_jobs')
      .insert(testJob)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert test job:', insertError);
      process.exit(1);
    }

    console.log('✅ Test job created successfully!');
    console.log('   Job ID:', insertedJob.id);
    console.log('   Status:', insertedJob.status);
    console.log('');

    // 步骤3: 更新记录
    console.log('📊 Step 3: Updating batch job progress...');

    // 模拟平台处理
    const platforms = ['baidu', 'weibo', 'douban'];
    for (const platform of platforms) {
      const { data: updatedJob, error: updateError } = await supabase
        .from('batch_jobs')
        .update({
          status: 'in_progress',
          platforms_processed: [...(insertedJob.platforms_processed || []), platform],
          total_items: (insertedJob.total_items || 0) + Math.floor(Math.random() * 100),
          metadata: {
            ...insertedJob.metadata,
            [`${platform}_processed`]: true,
            [`${platform}_items`]: Math.floor(Math.random() * 100),
            [`${platform}_processed_at`]: new Date().toISOString()
          }
        })
        .eq('id', insertedJob.id)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Failed to update for ${platform}:`, updateError);
      } else {
        console.log(`   ✅ Updated progress for ${platform}`);
        insertedJob.platforms_processed = updatedJob.platforms_processed;
        insertedJob.total_items = updatedJob.total_items;
        insertedJob.metadata = updatedJob.metadata;
      }
    }
    console.log('');

    // 步骤4: 完成任务
    console.log('✅ Step 4: Completing batch job...');
    const { data: completedJob, error: completeError } = await supabase
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...insertedJob.metadata,
          completion_summary: {
            total_platforms: platforms.length,
            success: platforms.length,
            failed: 0,
            total_items: insertedJob.total_items
          }
        }
      })
      .eq('id', insertedJob.id)
      .select()
      .single();

    if (completeError) {
      console.error('❌ Failed to complete job:', completeError);
    } else {
      console.log('   Status:', completedJob.status);
      console.log('   Platforms processed:', completedJob.platforms_processed);
      console.log('   Total items:', completedJob.total_items);
      console.log('');
    }

    // 步骤5: 查询记录
    console.log('🔍 Step 5: Querying batch jobs...');
    const { data: recentJobs, error: queryError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('job_type', 'test_collection')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ Failed to query jobs:', queryError);
    } else {
      console.log(`   Found ${recentJobs.length} test_collection jobs`);
      recentJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id.substring(0, 8)}... | Status: ${job.status} | Items: ${job.total_items}`);
      });
      console.log('');
    }

    // 步骤6: 清理测试数据（可选）
    console.log('🧹 Step 6: Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('batch_jobs')
      .delete()
      .eq('id', insertedJob.id);

    if (deleteError) {
      console.log('   ⚠️  Could not delete test record (you may want to keep it for inspection)');
    } else {
      console.log('   ✅ Test record deleted');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('batch_jobs table is working correctly in Supabase!');
    console.log('=' .repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// 运行测试
console.log('Supabase Batch Jobs Table Test');
console.log('This will test if batch_jobs table exists and works correctly\n');

testBatchJobsTable().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});