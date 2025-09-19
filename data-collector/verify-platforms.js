const axios = require('axios');

async function verifyAllPlatforms() {
  console.log('🔍 验证所有平台 API 端点\n');
  console.log('=' .repeat(60));

  const apiBaseUrl = 'http://localhost:8081/api/hot';

  // 你提供的平台列表
  const platforms = [
    'baidu',
    'toutiao',
    'douban',
    'xhs',
    '36kr',
    'juejin',
    'ithome',
    'weibo',
    'bili',
    'douyin'
  ];

  const results = [];

  for (const platform of platforms) {
    const url = `${apiBaseUrl}/${platform}`;

    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: { 'User-Agent': 'DataCollector/1.0' }
      });

      if (response.data?.code === 0 && response.data?.data) {
        const count = response.data.data.length;
        console.log(`✅ ${platform.padEnd(10)} - ${count} 条数据`);
        results.push({ platform, status: 'success', count });
      } else {
        console.log(`⚠️  ${platform.padEnd(10)} - 返回格式异常`);
        results.push({ platform, status: 'invalid', message: '数据格式异常' });
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${platform.padEnd(10)} - API服务未运行`);
        results.push({ platform, status: 'error', message: 'API服务未运行' });
      } else if (error.response?.status === 404) {
        console.log(`❌ ${platform.padEnd(10)} - 端点不存在`);
        results.push({ platform, status: 'not_found', message: '端点不存在' });
      } else {
        console.log(`❌ ${platform.padEnd(10)} - ${error.message}`);
        results.push({ platform, status: 'error', message: error.message });
      }
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 汇总：');

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');

  console.log(`   成功: ${successful.length}/${platforms.length}`);
  if (successful.length > 0) {
    console.log('   正常平台:', successful.map(r => r.platform).join(', '));
  }

  if (failed.length > 0) {
    console.log(`   失败: ${failed.length}`);
    console.log('   异常平台:', failed.map(r => r.platform).join(', '));
  }

  // 对应的 Supabase 表名
  console.log('\n📋 表名映射：');
  platforms.forEach(platform => {
    const tableName = `trending_${platform}`;
    const result = results.find(r => r.platform === platform);
    const status = result?.status === 'success' ? '✅' : '❌';
    console.log(`   ${platform.padEnd(10)} -> ${tableName.padEnd(20)} ${status}`);
  });

  console.log('\n💡 注意事项：');
  console.log('   1. weibo 使用 GitHub 数据源，不是从 API 获取');
  console.log('   2. bili API 返回的数据会保存到 trending_bili 表');
  console.log('   3. 确保 Railway 环境变量 PLATFORMS 包含所有平台');
  console.log('   4. 默认值现已包含: bili, douyin');

  console.log('\n' + '=' .repeat(60));
}

verifyAllPlatforms().then(() => {
  console.log('\n验证完成');
}).catch(error => {
  console.error('验证失败:', error);
});