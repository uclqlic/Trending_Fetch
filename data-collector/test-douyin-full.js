require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// 模拟数据收集器的核心逻辑
class DouyinTester {
  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/hot';
  }

  generateContentHash(title, url = '') {
    const content = `${title}${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async fetchDouyinData() {
    try {
      const url = `${this.apiBaseUrl}/douyin`;
      console.log(`📡 Fetching from: ${url}`);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'DataCollector/1.0'
        }
      });

      if (response.data && response.data.code === 0 && response.data.data) {
        return response.data.data;
      }

      console.log('❌ No data returned from API');
      return null;
    } catch (error) {
      console.error('❌ Error fetching data:', error.message);
      throw error;
    }
  }

  prepareRecords(data) {
    const records = [];

    data.forEach((item, index) => {
      const contentHash = this.generateContentHash(
        item.title || '',
        item.to_url || item.toUrl || item.url || ''
      );

      const record = {
        rank: item.pos || item.position || index + 1,
        title: item.title || '',
        url: item.to_url || item.toUrl || item.url || '',
        hot_value: parseInt(item.hot_val || item.hotVal || '0') || null,
        category: item.lab || item.label || null,
        content_hash: contentHash,
        original_data: {
          description: item.desc || item.description || '',
          icon: item.icon || '',
          is_top: item.is_top || item.isTop || 0,
          raw_hot_val: item.hot_val || item.hotVal || ''
        },
        fetched_at: new Date().toISOString()
      };

      records.push(record);
    });

    return records;
  }

  async testSupabaseSave(records) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.log('\n⚠️  Supabase not configured, skipping database test');
      console.log('   To test database saving, configure .env with:');
      console.log('   SUPABASE_URL=your_url');
      console.log('   SUPABASE_KEY=your_key');
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('\n📊 Testing Supabase save...');

    try {
      // 测试插入一条记录
      const testRecord = records[0];
      const { data, error } = await supabase
        .from('trending_douyin')
        .upsert(testRecord, {
          onConflict: 'content_hash',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        console.log('\n🔍 Possible issues:');
        console.log('   1. Table trending_douyin does not exist');
        console.log('   2. Table structure mismatch');
        console.log('   3. Permissions issue');
      } else {
        console.log('✅ Successfully saved to trending_douyin!');
        console.log('   Saved record ID:', data[0]?.id);
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
    }
  }
}

async function runTest() {
  console.log('🔍 Douyin Data Collection Full Test\n');
  console.log('=' .repeat(50));

  const tester = new DouyinTester();

  try {
    // 步骤1: 获取数据
    console.log('Step 1: Fetching Douyin data from API...');
    const data = await tester.fetchDouyinData();

    if (!data) {
      console.log('❌ No data to process');
      return;
    }

    console.log(`✅ Fetched ${data.length} items\n`);

    // 步骤2: 准备记录
    console.log('Step 2: Preparing records for database...');
    const records = tester.prepareRecords(data);
    console.log(`✅ Prepared ${records.length} records`);

    // 显示样例记录
    console.log('\n📋 Sample record structure:');
    const sampleRecord = records[0];
    console.log(JSON.stringify(sampleRecord, null, 2));

    // 步骤3: 测试数据库保存
    await tester.testSupabaseSave(records);

    // 步骤4: 分析问题
    console.log('\n' + '=' .repeat(50));
    console.log('📌 Analysis Summary:');
    console.log('   - API返回数据: ✅ 正常');
    console.log('   - 数据处理: ✅ 正常');
    console.log('   - 表名: trending_douyin');
    console.log('   - content_hash生成: ✅ 正常');

    console.log('\n💡 如果数据未更新，可能原因：');
    console.log('   1. content_hash重复（数据已存在）');
    console.log('   2. 表trending_douyin不存在或结构不匹配');
    console.log('   3. Supabase配置错误');
    console.log('   4. 网络或权限问题');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
}

runTest().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});