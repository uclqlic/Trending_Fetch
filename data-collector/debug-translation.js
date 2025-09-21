// 调试脚本：检查翻译数据对应关系问题

function analyzeTranslationIssue() {
  console.log('🔍 分析翻译数据错位问题\n');
  console.log('=' .repeat(60));

  // 模拟数据
  const originalItems = [
    { title: '军训时也是跳上Lucifer了', rank: 999, url: 'https://www.douyin.com/xxx1' },
    { title: '蔡国强就烟花秀争议发布说明', rank: 11, url: 'https://www.douyin.com/xxx2' },
    { title: '塞尔维亚举行阅兵式', rank: 1, url: 'https://www.douyin.com/xxx3' },
    { title: '我是又甜又酷的流光系少女', rank: 9, url: 'https://www.douyin.com/xxx4' }
  ];

  // 模拟 OpenAI 返回的翻译（可能会有问题）
  const mockOpenAIResponse = `1. Even during military training, I still dance
2. Cai Guoqiang releases statement on fireworks controversy
3. Serbia holds a military parade
4. I am a sweet and cool light girl`;

  // 当前的解析方法
  const translations = mockOpenAIResponse.split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\d+\.\s*/, '').replace('[empty]', ''));

  console.log('原始数据:');
  originalItems.forEach((item, i) => {
    console.log(`${i}: ${item.title} (rank ${item.rank})`);
  });

  console.log('\nOpenAI 返回的翻译:');
  translations.forEach((t, i) => {
    console.log(`${i}: ${t}`);
  });

  console.log('\n问题分析:');
  console.log('❌ 问题1: 数据是按 rank 排序的，不是按原始顺序');
  console.log('   - 原始第1条 rank=999，但翻译可能对应了别的');
  console.log('   - 原始第3条 rank=1，位置也不对');

  console.log('\n❌ 问题2: OpenAI 可能重新排序或跳过某些项');
  console.log('   - 如果某些标题为空或特殊字符，OpenAI 可能跳过');
  console.log('   - 导致翻译数组长度与原始数组不匹配');

  console.log('\n❌ 问题3: 批量翻译时顺序保证');
  console.log('   - translateBatch 中 items[index] 对应 translatedTitles[index]');
  console.log('   - 如果 OpenAI 返回的数量不对，索引就会错位');

  console.log('\n' + '=' .repeat(60));
  console.log('💡 解决方案:\n');

  console.log('1. 在发送给 OpenAI 之前，明确标记每个项的索引');
  console.log('2. 要求 OpenAI 返回相同数量的翻译，保持顺序');
  console.log('3. 添加验证：检查返回的翻译数量是否匹配');
  console.log('4. 如果不匹配，记录警告并使用原文');

  // 建议的改进
  console.log('\n📝 建议的代码改进:');
  console.log(`
async translateWithOpenAI(texts, targetLang, sourceLang = 'Chinese') {
  // ...

  const prompt = \`Translate the following \${sourceLang} texts to \${langNames[targetLang]}.
IMPORTANT:
- You MUST return EXACTLY \${texts.length} translations
- Maintain the exact order as provided
- If a text is empty, return "[EMPTY]"
- Do not skip any items
- Each translation must be on a separate line with its index

Texts to translate:
\${texts.map((t, i) => \`\${i + 1}. \${t || '[EMPTY]'}\`).join('\\n')}\`;

  // 解析时验证数量
  const translations = translatedText.split('\\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\\d+\\.\\s*/, ''));

  // 验证数量匹配
  if (translations.length !== texts.length) {
    logger.warn(\`Translation count mismatch: expected \${texts.length}, got \${translations.length}\`);
    // 补齐或截断
    while (translations.length < texts.length) {
      translations.push(texts[translations.length]); // 使用原文
    }
    if (translations.length > texts.length) {
      translations.length = texts.length; // 截断多余的
    }
  }

  return translations;
}
  `);

  console.log('\n' + '=' .repeat(60));
}

analyzeTranslationIssue();