// 多语言翻译系统测试
const TranslationService = require('./src/services/translator');
const logger = require('./src/config/logger');

class MultilingualTranslationTester {
  constructor() {
    this.translator = new TranslationService();
    this.testResults = {};
  }

  /**
   * 测试用例数据 - 涵盖各种字符集和语言特性
   */
  getTestCases() {
    return {
      basic: [
        '热门话题',
        '科技新闻',
        '娱乐八卦'
      ],
      mixed: [
        '苹果iPhone 15发布会',
        '微博热搜Top 10',
        '2024年奥运会'
      ],
      complex: [
        '人工智能ChatGPT引发教育变革讨论',
        '新能源汽车销量超过传统燃油车',
        '元宇宙概念股集体上涨引发市场关注'
      ],
      special: [
        '', // 空字符串测试
        '🔥热门', // 表情符号测试
        'AI vs 人类：谁更强？' // 特殊符号测试
      ],
      edge: [
        '   多余空格   ', // 空格处理
        '测试"引号"处理', // 引号转义
        '测试\\反斜杠处理' // 反斜杠转义
      ]
    };
  }

  /**
   * 语言特定的验证规则
   */
  getLanguageValidations() {
    return {
      'en': {
        name: 'English',
        validate: (text) => {
          // 验证英文字符和基本结构
          return /^[a-zA-Z0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/]*$/.test(text);
        },
        expectPattern: /[a-zA-Z]/
      },
      'ja': {
        name: 'Japanese',
        validate: (text) => {
          // 验证日文字符（平假名、片假名、汉字）
          return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3000-\u303F\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/0-9a-zA-Z]*$/.test(text);
        },
        expectPattern: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/
      },
      'ko': {
        name: 'Korean',
        validate: (text) => {
          // 验证韩文字符（韩文字母）
          return /^[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/0-9a-zA-Z]*$/.test(text);
        },
        expectPattern: /[\uAC00-\uD7AF]/
      },
      'es': {
        name: 'Spanish',
        validate: (text) => {
          // 验证西班牙文字符（包括重音符号）
          return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/]*$/.test(text);
        },
        expectPattern: /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/
      },
      'fr': {
        name: 'French',
        validate: (text) => {
          // 验证法文字符（包括重音符号和cedilla）
          return /^[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/]*$/.test(text);
        },
        expectPattern: /[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/
      },
      'de': {
        name: 'German',
        validate: (text) => {
          // 验证德文字符（包括Umlaut）
          return /^[a-zA-ZäöüßÄÖÜ0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/]*$/.test(text);
        },
        expectPattern: /[a-zA-ZäöüßÄÖÜ]/
      },
      'ru': {
        name: 'Russian',
        validate: (text) => {
          // 验证俄文字符（西里尔字母）
          return /^[\u0400-\u04FF\u0500-\u052F0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/a-zA-Z]*$/.test(text);
        },
        expectPattern: /[\u0400-\u04FF]/
      },
      'ar': {
        name: 'Arabic',
        validate: (text) => {
          // 验证阿拉伯文字符
          return /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\-:,.!?'"()[\]{}@#$%^&*+=<>|\\~`/a-zA-Z]*$/.test(text);
        },
        expectPattern: /[\u0600-\u06FF\u0750-\u077F]/
      }
    };
  }

  /**
   * 运行单个语言的翻译测试
   */
  async testLanguage(langCode, testCases) {
    const validation = this.getLanguageValidations()[langCode];
    console.log(`\n🔄 Testing ${validation.name} (${langCode})...`);

    const results = {
      language: validation.name,
      code: langCode,
      total: 0,
      success: 0,
      failures: [],
      performance: {}
    };

    for (const [category, texts] of Object.entries(testCases)) {
      console.log(`  📝 Testing ${category} cases...`);

      const startTime = Date.now();

      try {
        const translations = await this.translator.translateWithOpenAI(texts, langCode);
        const endTime = Date.now();

        results.performance[category] = endTime - startTime;
        results.total += texts.length;

        // 验证翻译结果
        for (let i = 0; i < texts.length; i++) {
          const original = texts[i];
          const translation = translations[i];

          const testResult = this.validateTranslation(
            original,
            translation,
            langCode,
            validation
          );

          if (testResult.success) {
            results.success++;
            console.log(`    ✅ "${original}" → "${translation}"`);
          } else {
            results.failures.push({
              category,
              index: i,
              original,
              translation,
              issues: testResult.issues
            });
            console.log(`    ❌ "${original}" → "${translation}"`);
            console.log(`       Issues: ${testResult.issues.join(', ')}`);
          }
        }

      } catch (error) {
        console.log(`    ❌ Translation failed: ${error.message}`);
        results.failures.push({
          category,
          error: error.message,
          texts
        });
      }
    }

    return results;
  }

  /**
   * 验证单个翻译结果
   */
  validateTranslation(original, translation, langCode, validation) {
    const issues = [];

    // 基本检查
    if (typeof translation !== 'string') {
      issues.push('Translation is not a string');
      return { success: false, issues };
    }

    // 空字符串检查
    if (original === '' && translation !== '') {
      issues.push('Empty input should produce empty output');
    }

    if (original !== '' && translation === '') {
      issues.push('Non-empty input should not produce empty output');
    }

    // 字符集验证
    if (translation && !validation.validate(translation)) {
      issues.push(`Contains invalid characters for ${validation.name}`);
    }

    // 语言特征检查（非空且非英文原文的情况下）
    if (translation && original && langCode !== 'en') {
      if (!validation.expectPattern.test(translation)) {
        issues.push(`Does not contain expected ${validation.name} characters`);
      }
    }

    // JSON安全检查
    try {
      JSON.stringify([translation]);
    } catch (error) {
      issues.push('Translation is not JSON-safe');
    }

    // 长度合理性检查（翻译不应该过长或过短）
    if (original && translation) {
      const ratio = translation.length / original.length;
      if (ratio > 5) {
        issues.push('Translation suspiciously long');
      } else if (ratio < 0.2 && translation.length < 3) {
        issues.push('Translation suspiciously short');
      }
    }

    return {
      success: issues.length === 0,
      issues
    };
  }

  /**
   * 运行完整的多语言测试套件
   */
  async runCompleteTest() {
    console.log('🚀 Starting Multilingual Translation Test Suite');
    console.log('================================================\n');

    const testCases = this.getTestCases();
    const allResults = {};
    let totalTests = 0;
    let totalSuccess = 0;

    // 测试每种目标语言
    for (const langCode of Object.keys(this.translator.targetLanguages)) {
      try {
        const results = await this.testLanguage(langCode, testCases);
        allResults[langCode] = results;
        totalTests += results.total;
        totalSuccess += results.success;

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.log(`❌ Failed to test ${langCode}: ${error.message}`);
        allResults[langCode] = {
          language: langCode,
          error: error.message
        };
      }
    }

    // 生成测试报告
    this.generateTestReport(allResults, totalTests, totalSuccess);

    return allResults;
  }

  /**
   * 生成测试报告
   */
  generateTestReport(results, totalTests, totalSuccess) {
    console.log('\n📊 MULTILINGUAL TRANSLATION TEST REPORT');
    console.log('===============================================');

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${totalSuccess}`);
    console.log(`   Success Rate: ${((totalSuccess / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n🌐 Language-Specific Results:`);

    for (const [langCode, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`   ${langCode.toUpperCase()} (${result.language}): ❌ ERROR - ${result.error}`);
        continue;
      }

      const successRate = result.total > 0 ? ((result.success / result.total) * 100).toFixed(1) : 0;
      console.log(`   ${langCode.toUpperCase()} (${result.language}): ${result.success}/${result.total} (${successRate}%)`);

      if (result.failures.length > 0) {
        console.log(`      ⚠️  ${result.failures.length} failures detected`);
      }

      // 性能报告
      const avgPerformance = Object.values(result.performance || {}).reduce((a, b) => a + b, 0) / Object.keys(result.performance || {}).length;
      if (avgPerformance) {
        console.log(`      ⏱️  Average response time: ${avgPerformance.toFixed(0)}ms`);
      }
    }

    console.log(`\n🔍 Failure Analysis:`);
    let totalFailures = 0;
    const failureTypes = {};

    for (const result of Object.values(results)) {
      if (!result.failures) continue;

      totalFailures += result.failures.length;

      for (const failure of result.failures) {
        for (const issue of failure.issues || []) {
          failureTypes[issue] = (failureTypes[issue] || 0) + 1;
        }
      }
    }

    if (totalFailures > 0) {
      console.log(`   Total Failures: ${totalFailures}`);
      console.log(`   Common Issues:`);

      for (const [issue, count] of Object.entries(failureTypes)) {
        console.log(`      • ${issue}: ${count} occurrences`);
      }
    } else {
      console.log(`   🎉 No failures detected!`);
    }

    console.log('\n✅ Test Complete!');
  }

  /**
   * 快速测试特定语言
   */
  async quickTest(langCode, texts = ['测试', '你好世界', '']) {
    console.log(`🔬 Quick test for ${langCode}:`);

    try {
      const translations = await this.translator.translateWithOpenAI(texts, langCode);

      for (let i = 0; i < texts.length; i++) {
        console.log(`  "${texts[i]}" → "${translations[i]}"`);
      }

      return translations;
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      return null;
    }
  }
}

// 运行测试
async function runTests() {
  const tester = new MultilingualTranslationTester();

  try {
    // 检查是否配置了API密钥
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not configured. Please set your API key to run tests.');
      process.exit(1);
    }

    // 运行完整测试或快速测试
    const testMode = process.argv[2];

    if (testMode === 'quick') {
      const langCode = process.argv[3] || 'en';
      await tester.quickTest(langCode);
    } else if (testMode === 'single') {
      const langCode = process.argv[3] || 'en';
      const testCases = tester.getTestCases();
      await tester.testLanguage(langCode, testCases);
    } else {
      await tester.runCompleteTest();
    }

  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = MultilingualTranslationTester;