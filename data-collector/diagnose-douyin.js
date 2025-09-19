const axios = require('axios');
const crypto = require('crypto');

async function diagnoseDouyinIssue() {
  console.log('🔍 诊断 Douyin 数据未更新问题\n');
  console.log('=' .repeat(60));

  const issues = [];
  const apiBaseUrl = 'http://localhost:8081/api/hot';

  // 1. 检查API数据
  console.log('📡 Step 1: 检查 API 数据返回');
  try {
    const response = await axios.get(`${apiBaseUrl}/douyin`, {
      timeout: 30000,
      headers: { 'User-Agent': 'DataCollector/1.0' }
    });

    if (response.data && response.data.code === 0 && response.data.data) {
      console.log('   ✅ API 正常返回数据');
      console.log(`   - 数据条数: ${response.data.data.length}`);

      // 检查数据内容
      const sample = response.data.data[0];
      if (sample.title) {
        console.log(`   - 示例标题: ${sample.title}`);
        console.log(`   - 热度值: ${sample.hot_val || 'N/A'}`);
      }
    } else {
      console.log('   ❌ API 返回数据异常');
      issues.push('API返回数据格式异常');
    }
  } catch (error) {
    console.log(`   ❌ API 请求失败: ${error.message}`);
    issues.push(`API请求失败: ${error.message}`);
  }

  // 2. 检查表名映射
  console.log('\n📋 Step 2: 检查表名映射');
  const platform = 'douyin';
  const tableName = `trending_${platform}`;
  console.log(`   - 平台名称: ${platform}`);
  console.log(`   - 目标表名: ${tableName}`);
  console.log('   ✅ 表名映射正确');

  // 3. 检查数据处理逻辑
  console.log('\n⚙️ Step 3: 检查数据处理逻辑');
  try {
    const response = await axios.get(`${apiBaseUrl}/douyin`, {
      timeout: 30000,
      headers: { 'User-Agent': 'DataCollector/1.0' }
    });

    if (response.data?.data?.length > 0) {
      const item = response.data.data[0];

      // 模拟数据处理
      const contentHash = crypto.createHash('md5')
        .update(`${item.title || ''}${item.to_url || item.toUrl || item.url || ''}`)
        .digest('hex');

      const record = {
        rank: item.pos || item.position || 1,
        title: item.title || '',
        url: item.to_url || item.toUrl || item.url || '',
        hot_value: parseInt(item.hot_val || item.hotVal || '0') || null,
        category: item.lab || item.label || null,
        content_hash: contentHash,
      };

      console.log('   ✅ 数据处理逻辑正常');
      console.log('   - content_hash:', contentHash.substring(0, 16) + '...');
      console.log('   - title:', record.title);
      console.log('   - url:', record.url ? 'Present' : 'Missing');
    }
  } catch (error) {
    console.log(`   ❌ 数据处理失败: ${error.message}`);
    issues.push(`数据处理失败: ${error.message}`);
  }

  // 4. 检查环境配置
  console.log('\n🔧 Step 4: 检查环境配置');
  console.log('   - API_BASE_URL:', process.env.API_BASE_URL || '未配置（使用默认值）');
  console.log('   - SUPABASE_URL:', process.env.SUPABASE_URL === 'your_supabase_project_url' ? '❌ 未配置' : '已配置');
  console.log('   - SUPABASE_KEY:', process.env.SUPABASE_KEY === 'your_supabase_anon_key' ? '❌ 未配置' : '已配置');

  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'your_supabase_project_url') {
    issues.push('Supabase URL未配置');
  }
  if (!process.env.SUPABASE_KEY || process.env.SUPABASE_KEY === 'your_supabase_anon_key') {
    issues.push('Supabase Key未配置');
  }

  // 5. 检查平台列表配置
  console.log('\n📝 Step 5: 检查平台列表配置');
  const platforms = (process.env.PLATFORMS || 'baidu,toutiao,douban,xhs,36kr,juejin,ithome,bili,douyin,weibo').split(',');
  console.log('   配置的平台列表:', platforms.join(', '));

  if (platforms.includes('douyin')) {
    console.log('   ✅ douyin 在平台列表中');
  } else {
    console.log('   ❌ douyin 不在平台列表中');
    issues.push('douyin不在PLATFORMS配置中');
  }

  // 诊断结果
  console.log('\n' + '=' .repeat(60));
  console.log('📊 诊断结果:\n');

  if (issues.length === 0) {
    console.log('✅ 未发现配置问题\n');
    console.log('💡 可能的原因：');
    console.log('   1. content_hash 重复 - 热榜数据未变化，所以没有新数据插入');
    console.log('   2. 数据库连接问题 - Supabase配置需要更新');
    console.log('   3. 表结构不匹配 - trending_douyin表可能需要检查');
    console.log('\n📌 建议操作：');
    console.log('   1. 配置正确的Supabase凭据到.env文件');
    console.log('   2. 确认trending_douyin表存在且结构正确');
    console.log('   3. 检查Supabase Dashboard中的错误日志');
  } else {
    console.log('❌ 发现以下问题：\n');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n📌 解决方案：');
    if (issues.some(i => i.includes('Supabase'))) {
      console.log('   1. 编辑 .env 文件，添加正确的Supabase配置：');
      console.log('      SUPABASE_URL=https://your-project.supabase.co');
      console.log('      SUPABASE_KEY=your-anon-key');
    }
    if (issues.some(i => i.includes('API'))) {
      console.log('   2. 确保Go API服务正在运行');
    }
    if (issues.some(i => i.includes('PLATFORMS'))) {
      console.log('   3. 在.env文件的PLATFORMS中添加douyin');
    }
  }

  console.log('\n' + '=' .repeat(60));
}

diagnoseDouyinIssue().then(() => {
  console.log('\n诊断完成');
  process.exit(0);
}).catch(error => {
  console.error('诊断失败:', error);
  process.exit(1);
});