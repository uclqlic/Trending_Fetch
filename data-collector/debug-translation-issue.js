// 调试脚本：检查翻译为什么返回原文

const TranslationService = require('./src/services/translator');

async function debugTranslationIssue() {
  console.log('🔍 调试翻译问题：为什么返回原文？\n');
  console.log('=' .repeat(60));

  const translator = new TranslationService();

  // 测试数据
  const testTexts = [
    '2025衡水湖马拉松',
    '寒际中国职业赛西安站',
    '9月30号上完课的你',
    'BLG vs TES',
    '中国制造业企业500强榜单发布'
  ];

  console.log('📝 测试数据：');
  testTexts.forEach((text, i) => console.log(`   ${i + 1}. ${text}`));
  console.log('');

  // 检查 OpenAI API 配置
  console.log('🔧 环境配置检查：');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '已配置' : '❌ 未配置'}`);

  if (!process.env.OPENAI_API_KEY) {
    console.log('\n❌ 问题找到了！');
    console.log('   OpenAI API Key 没有配置');
    console.log('   翻译服务会返回原文');
    console.log('\n💡 解决方案：');
    console.log('   1. 在 .env 文件中配置 OPENAI_API_KEY');
    console.log('   2. 获取 API Key: https://platform.openai.com/api-keys');
    return;
  }

  console.log('\n🔬 测试翻译功能：');

  // 测试英文翻译
  try {
    console.log('\n测试英文翻译...');
    const enTranslations = await translator.translateWithOpenAI(testTexts, 'en', 'Chinese');

    console.log('英文翻译结果：');
    testTexts.forEach((original, i) => {
      const translated = enTranslations[i];
      const isSame = original === translated;
      console.log(`   ${i + 1}. ${original}`);
      console.log(`      -> ${translated} ${isSame ? '❌ (相同)' : '✅'}`);
    });

    // 检查是否所有翻译都返回了原文
    const allSame = testTexts.every((text, i) => text === enTranslations[i]);
    if (allSame) {
      console.log('\n❌ 所有翻译都返回了原文！');
      console.log('可能的原因：');
      console.log('   1. OpenAI API Key 无效');
      console.log('   2. API 调用失败但错误被捕获');
      console.log('   3. 解析响应时出错');
    }

  } catch (error) {
    console.error('\n❌ 翻译失败：', error.message);
    console.error('详细错误：', error);
  }

  // 测试日文翻译
  try {
    console.log('\n测试日文翻译...');
    const jaTranslations = await translator.translateWithOpenAI(testTexts, 'ja', 'Chinese');

    console.log('日文翻译结果：');
    testTexts.forEach((original, i) => {
      const translated = jaTranslations[i];
      const isSame = original === translated;
      console.log(`   ${i + 1}. ${original}`);
      console.log(`      -> ${translated} ${isSame ? '❌ (相同)' : '✅'}`);
    });

  } catch (error) {
    console.error('\n❌ 日文翻译失败：', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('💡 诊断结果：');

  if (!translator.openai) {
    console.log('❌ OpenAI 客户端未初始化');
    console.log('   原因：API Key 未配置或无效');
  } else {
    console.log('✅ OpenAI 客户端已初始化');
    console.log('   如果仍然返回原文，检查：');
    console.log('   1. API Key 是否有效');
    console.log('   2. API 余额是否充足');
    console.log('   3. 网络连接是否正常');
  }

  console.log('\n' + '=' .repeat(60));
}

// 加载环境变量
require('dotenv').config();

// 运行调试
debugTranslationIssue().then(() => {
  console.log('\n调试完成');
}).catch(error => {
  console.error('调试失败：', error);
});