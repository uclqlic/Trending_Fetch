const axios = require('axios');

async function debugDouyinMapping() {
  console.log('🔍 调试 Douyin 平台名称映射问题\n');
  console.log('=' .repeat(60));

  const apiBaseUrl = 'http://localhost:8081/api/hot';

  // 测试所有已知的平台，查看它们的API路径和表名映射
  const platforms = [
    'baidu',
    'toutiao',
    'douban',
    'xhs',
    '36kr',
    'juejin',
    'ithome',
    'bili',
    'douyin',
    'weibo'
  ];

  console.log('📋 平台映射检查：\n');
  console.log('API路径 -> 表名');
  console.log('-'.repeat(40));

  for (const platform of platforms) {
    const apiPath = platform;
    const tableName = `trending_${platform}`;

    // 特殊处理
    if (platform === 'bili') {
      console.log(`/api/hot/${apiPath} -> ${tableName} ✅ (特殊说明)`)
    } else {
      console.log(`/api/hot/${apiPath} -> ${tableName}`);
    }
  }

  console.log('\n🔌 测试 Douyin API 响应：');

  try {
    // 直接测试 douyin 端点
    const url = `${apiBaseUrl}/douyin`;
    console.log(`\n正在请求: ${url}`);

    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'DataCollector/1.0' }
    });

    if (response.data?.data) {
      console.log(`✅ API 返回 ${response.data.data.length} 条数据`);

      // 检查数据结构
      const firstItem = response.data.data[0];
      console.log('\n数据结构示例：');
      console.log('  标题:', firstItem.title);
      console.log('  URL:', firstItem.to_url || firstItem.url);
      console.log('  热度:', firstItem.hot_val);
      console.log('  位置:', firstItem.pos);
    }
  } catch (error) {
    console.error(`❌ API 请求失败: ${error.message}`);
  }

  // 检查可能的问题
  console.log('\n' + '=' .repeat(60));
  console.log('💡 可能的问题分析：\n');

  console.log('1. 表名问题');
  console.log('   当前映射: douyin -> trending_douyin');
  console.log('   确认: Supabase 中是否存在 trending_douyin 表？');
  console.log('');

  console.log('2. API 端点问题');
  console.log('   API 路径: /api/hot/douyin');
  console.log('   确认: Go API 是否提供 douyin 端点？');
  console.log('');

  console.log('3. 特殊映射问题');
  console.log('   bili 有特殊说明，douyin 可能也需要特殊处理？');
  console.log('   检查: Go API 返回的数据中是否有平台标识字段？');
  console.log('');

  console.log('4. 大小写问题');
  console.log('   douyin 还是 douYin 还是 dy？');
  console.log('   检查: API 和数据库中的命名是否一致？');

  // 建议的修复
  console.log('\n📌 建议的检查步骤：');
  console.log('1. 在 Supabase Dashboard 确认 trending_douyin 表存在');
  console.log('2. 检查 Railway 上的环境变量 PLATFORMS 是否包含 douyin');
  console.log('3. 查看 Railway 日志中 douyin 收集的具体错误');
  console.log('4. 可能需要为 douyin 添加特殊的表名映射逻辑');

  console.log('\n' + '=' .repeat(60));
}

debugDouyinMapping().then(() => {
  console.log('\n调试完成');
}).catch(error => {
  console.error('调试失败:', error);
});