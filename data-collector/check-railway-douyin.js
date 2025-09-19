require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

async function checkRailwayDouyinIssue() {
  console.log('🚂 Railway Douyin 问题诊断\n');
  console.log('=' .repeat(60));

  // 检查环境变量
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/hot';
  const isRailway = apiUrl.includes('railway');

  console.log('📋 环境信息：');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Environment: ${isRailway ? 'Railway' : 'Local'}`);
  console.log(`   Platforms: ${process.env.PLATFORMS || 'default'}`);
  console.log('');

  // 如果配置了 Supabase，检查数据库
  if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_project_url') {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('📊 检查 Supabase 数据库：\n');

    // 检查 collection_logs 表中的 douyin 记录
    try {
      const { data: logs, error } = await supabase
        .from('collection_logs')
        .select('*')
        .eq('platform', 'douyin')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.log('   ❌ 无法查询 collection_logs:', error.message);
      } else if (logs && logs.length > 0) {
        console.log('   最近的 douyin 收集日志：');
        logs.forEach((log, index) => {
          console.log(`   ${index + 1}. ${new Date(log.created_at).toLocaleString()}`);
          console.log(`      状态: ${log.status}`);
          console.log(`      收集: ${log.items_collected} 项`);
          if (log.error_message) {
            console.log(`      错误: ${log.error_message}`);
          }
          console.log('');
        });
      } else {
        console.log('   ⚠️  没有找到 douyin 的收集日志');
      }
    } catch (err) {
      console.log('   ❌ 查询失败:', err.message);
    }

    // 检查 trending_douyin 表
    try {
      console.log('📈 检查 trending_douyin 表：');

      // 检查表是否存在
      const { count: totalCount, error: countError } = await supabase
        .from('trending_douyin')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        if (countError.message.includes('does not exist')) {
          console.log('   ❌ trending_douyin 表不存在！');
          console.log('   需要创建表，使用与其他 trending 表相同的结构');
        } else {
          console.log('   ❌ 查询错误:', countError.message);
        }
      } else {
        console.log(`   ✅ 表存在，共有 ${totalCount} 条记录`);

        // 获取最新的记录
        const { data: latest, error: latestError } = await supabase
          .from('trending_douyin')
          .select('created_at, updated_at, fetched_at')
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();

        if (latest) {
          console.log(`   最后更新时间: ${new Date(latest.fetched_at || latest.updated_at).toLocaleString()}`);
        }
      }
    } catch (err) {
      console.log('   ❌ 检查表失败:', err.message);
    }

    // 对比其他成功的平台
    console.log('\n🔍 对比其他平台（以 baidu 为例）：');
    try {
      const { count: baiduCount } = await supabase
        .from('trending_baidu')
        .select('*', { count: 'exact', head: true });

      const { data: baiduLatest } = await supabase
        .from('trending_baidu')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      console.log(`   trending_baidu: ${baiduCount} 条记录`);
      if (baiduLatest) {
        console.log(`   最后更新: ${new Date(baiduLatest.fetched_at).toLocaleString()}`);
      }
    } catch (err) {
      console.log('   无法获取 baidu 数据');
    }
  }

  // 测试 API 返回
  console.log('\n🔌 测试 API 连接：');
  try {
    // 测试 douyin
    const douyinUrl = `${apiUrl}/douyin`;
    console.log(`   测试 ${douyinUrl}`);
    const douyinResp = await axios.get(douyinUrl, { timeout: 10000 });
    if (douyinResp.data?.data) {
      console.log(`   ✅ Douyin API 返回 ${douyinResp.data.data.length} 条数据`);
    } else {
      console.log('   ❌ Douyin API 返回格式异常');
    }

    // 测试另一个平台作对比
    const baiduUrl = `${apiUrl}/baidu`;
    console.log(`   测试 ${baiduUrl}`);
    const baiduResp = await axios.get(baiduUrl, { timeout: 10000 });
    if (baiduResp.data?.data) {
      console.log(`   ✅ Baidu API 返回 ${baiduResp.data.data.length} 条数据`);
    }
  } catch (err) {
    console.log(`   ❌ API 测试失败: ${err.message}`);
    if (isRailway) {
      console.log('   提示: 在 Railway 上可能需要使用内部服务 URL');
      console.log('   例如: http://hots-api.railway.internal:8081/api/hot');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('💡 可能的原因和解决方案：\n');

  console.log('1. 表不存在或结构不同');
  console.log('   - 确认 trending_douyin 表存在');
  console.log('   - 检查表结构是否与其他 trending 表一致');
  console.log('');

  console.log('2. content_hash 冲突');
  console.log('   - douyin 数据可能变化不频繁，导致 content_hash 重复');
  console.log('   - 可以尝试清空表重新收集');
  console.log('');

  console.log('3. API 连接问题（Railway 特定）');
  console.log('   - 检查 Railway 环境变量 API_BASE_URL');
  console.log('   - 使用内部服务 URL 可能更稳定');
  console.log('');

  console.log('4. 数据格式差异');
  console.log('   - douyin API 返回的数据格式可能与其他平台略有不同');
  console.log('   - 需要检查字段映射是否正确');

  console.log('\n' + '=' .repeat(60));
}

checkRailwayDouyinIssue().then(() => {
  console.log('\n诊断完成');
}).catch(error => {
  console.error('诊断失败:', error);
});