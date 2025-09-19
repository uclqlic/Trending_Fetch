#!/usr/bin/env node

/**
 * Railway服务健康检查脚本
 * 使用方法: node test-railway-service.js <your-service-url>
 * 例如: node test-railway-service.js https://hots-api.railway.app
 */

const SERVICE_URL = process.argv[2];

if (!SERVICE_URL) {
  console.log('❌ 请提供Railway服务URL');
  console.log('用法: node test-railway-service.js https://your-service.railway.app');
  process.exit(1);
}

// 测试的平台列表
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
  'zhihu'
];

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`\n${colors.blue}🔍 开始测试Railway服务: ${SERVICE_URL}${colors.reset}`);
console.log('=' .repeat(60));

// 测试函数
async function testPlatform(platform) {
  const url = `${SERVICE_URL}/api/hot/${platform}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Railway-Service-Test/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10秒超时
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    // 检查响应
    if (response.ok && data.code === 0) {
      const itemCount = data.data ? data.data.length : 0;
      console.log(`${colors.green}✅ ${platform.padEnd(10)} | ${responseTime}ms | ${itemCount} items${colors.reset}`);

      // 显示第一条数据作为样例
      if (data.data && data.data[0]) {
        const firstItem = data.data[0];
        console.log(`   └─ 示例: "${firstItem.title?.substring(0, 30)}..."`);
      }
      return { platform, success: true, responseTime, itemCount };
    } else {
      console.log(`${colors.yellow}⚠️  ${platform.padEnd(10)} | ${responseTime}ms | 响应码: ${data.code}${colors.reset}`);
      return { platform, success: false, responseTime, error: `Code: ${data.code}` };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`${colors.red}❌ ${platform.padEnd(10)} | ${responseTime}ms | ${error.message}${colors.reset}`);
    return { platform, success: false, responseTime, error: error.message };
  }
}

// 主测试流程
async function runTests() {
  const results = [];

  // 测试基础连接
  console.log(`\n${colors.blue}1. 测试基础连接${colors.reset}`);
  console.log('-' .repeat(60));

  try {
    const response = await fetch(SERVICE_URL, {
      signal: AbortSignal.timeout(5000)
    });
    console.log(`${colors.green}✅ 服务可访问 (HTTP ${response.status})${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ 无法连接到服务: ${error.message}${colors.reset}`);
    console.log('\n请检查:');
    console.log('1. 服务URL是否正确');
    console.log('2. 服务是否已启动');
    console.log('3. 网络连接是否正常');
    return;
  }

  // 测试各平台API
  console.log(`\n${colors.blue}2. 测试各平台API${colors.reset}`);
  console.log('-' .repeat(60));

  for (const platform of platforms) {
    const result = await testPlatform(platform);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // 避免请求过快
  }

  // 统计结果
  console.log(`\n${colors.blue}3. 测试结果统计${colors.reset}`);
  console.log('-' .repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log(`${colors.green}✅ 成功: ${successCount}/${platforms.length}${colors.reset}`);
  if (failCount > 0) {
    console.log(`${colors.red}❌ 失败: ${failCount}/${platforms.length}${colors.reset}`);
  }
  console.log(`⏱️  平均响应时间: ${avgResponseTime}ms`);

  // 显示失败的平台
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log(`\n${colors.yellow}需要关注的平台:${colors.reset}`);
    failed.forEach(f => {
      console.log(`  - ${f.platform}: ${f.error}`);
    });
  }

  // 总体评估
  console.log(`\n${colors.blue}4. 服务健康状态${colors.reset}`);
  console.log('-' .repeat(60));

  if (successCount === platforms.length) {
    console.log(`${colors.green}🎉 优秀！所有平台API都正常工作${colors.reset}`);
  } else if (successCount >= platforms.length * 0.8) {
    console.log(`${colors.green}✅ 良好！大部分平台API正常工作${colors.reset}`);
  } else if (successCount >= platforms.length * 0.5) {
    console.log(`${colors.yellow}⚠️  一般！部分平台API存在问题${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ 需要检查！大部分平台API无法工作${colors.reset}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('测试完成！\n');
}

// 执行测试
runTests().catch(error => {
  console.error(`${colors.red}测试失败: ${error.message}${colors.reset}`);
  process.exit(1);
});