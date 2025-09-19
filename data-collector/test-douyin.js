const axios = require('axios');

async function testDouyinAPI() {
  console.log('🔍 Testing Douyin Data Collection\n');
  console.log('=' .repeat(50));

  const apiBaseUrl = 'http://localhost:8081/api/hot';

  try {
    // 步骤1: 测试API是否返回douyin数据
    console.log('1. Testing API endpoint for douyin...');
    const url = `${apiBaseUrl}/douyin`;
    console.log(`   URL: ${url}`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'DataCollector/1.0'
      }
    });

    if (response.data && response.data.code === 0 && response.data.data) {
      console.log('✅ API returned data successfully!');
      console.log(`   Data count: ${response.data.data.length} items`);

      // 显示前3条数据作为样例
      console.log('\n   Sample data:');
      response.data.data.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. Title: ${item.title || 'N/A'}`);
        console.log(`      URL: ${item.to_url || item.toUrl || item.url || 'N/A'}`);
        console.log(`      Hot Value: ${item.hot_val || item.hotVal || 'N/A'}`);
        console.log(`      Position: ${item.pos || item.position || 'N/A'}`);
        console.log('');
      });

      // 检查数据结构
      console.log('2. Checking data structure...');
      const firstItem = response.data.data[0];
      console.log('   Fields in first item:');
      Object.keys(firstItem).forEach(key => {
        console.log(`   - ${key}: ${typeof firstItem[key]} = "${firstItem[key]}"`);
      });

    } else {
      console.log('❌ No data returned from API');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error fetching douyin data:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }

    console.log('\n📌 Possible issues:');
    console.log('   1. API服务未运行 - 确保Go API服务正在运行');
    console.log('   2. douyin端点不存在 - API可能不支持douyin');
    console.log('   3. 网络问题 - 检查网络连接');
  }

  console.log('\n' + '=' .repeat(50));
}

// 测试表名问题
console.log('📋 Expected table name: trending_douyin');
console.log('   Note: Make sure this table exists in Supabase\n');

testDouyinAPI().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});