const OpenAI = require('openai');
const logger = require('../config/logger');
const { supabase } = require('../config/database');
const BatchJobService = require('./batchJobService');

class TranslationService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.openai = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
    this.batchJobService = new BatchJobService();
    // 支持的目标语言及其对应的表名（根据实际存在的表）
    this.targetLanguages = {
      'en': 'translations_en',  // 英语
      'ja': 'translations_ja',  // 日语
      'ko': 'translations_ko',  // 韩语
      'es': 'translations_es',  // 西班牙语
      'fr': 'translations_fr',  // 法语
      'de': 'translations_de',  // 德语
      'ru': 'translations_ru',  // 俄语
      'ar': 'translations_ar'   // 阿拉伯语
    };
  }

  /**
   * 获取语言特定的配置
   */
  getLanguageConfig(targetLang) {
    const configs = {
      'en': {
        name: 'English',
        script: 'Latin',
        direction: 'ltr',
        temperature: 0.1,
        maxTokens: 2000,
        specialInstructions: 'Use natural, idiomatic English expressions.'
      },
      'ja': {
        name: 'Japanese',
        script: 'Mixed (Hiragana, Katakana, Kanji)',
        direction: 'ltr',
        temperature: 0.15,
        maxTokens: 2500,
        specialInstructions: 'Use appropriate levels of politeness (keigo). Mix hiragana, katakana, and kanji naturally. Maintain Japanese sentence structure.'
      },
      'ko': {
        name: 'Korean',
        script: 'Hangul',
        direction: 'ltr',
        temperature: 0.15,
        maxTokens: 2500,
        specialInstructions: 'Use appropriate honorific levels. Maintain Korean sentence structure (SOV). Use Hangul characters properly.'
      },
      'es': {
        name: 'Spanish',
        script: 'Latin',
        direction: 'ltr',
        temperature: 0.1,
        maxTokens: 2000,
        specialInstructions: 'Use neutral Spanish suitable for international audiences. Maintain proper gender agreement.'
      },
      'fr': {
        name: 'French',
        script: 'Latin',
        direction: 'ltr',
        temperature: 0.1,
        maxTokens: 2000,
        specialInstructions: 'Use standard French. Maintain proper gender agreement and formal/informal register as appropriate.'
      },
      'de': {
        name: 'German',
        script: 'Latin',
        direction: 'ltr',
        temperature: 0.1,
        maxTokens: 2200,
        specialInstructions: 'Use standard German. Apply proper capitalization rules for nouns. Maintain compound word structure when appropriate.'
      },
      'ru': {
        name: 'Russian',
        script: 'Cyrillic',
        direction: 'ltr',
        temperature: 0.15,
        maxTokens: 2200,
        specialInstructions: 'Use proper Cyrillic script. Maintain Russian grammatical cases and word order. Ensure proper encoding of special characters.'
      },
      'ar': {
        name: 'Arabic',
        script: 'Arabic',
        direction: 'rtl',
        temperature: 0.2,
        maxTokens: 2500,
        specialInstructions: 'Use Modern Standard Arabic (MSA). Maintain right-to-left text direction. Use proper Arabic script connection rules. Ensure proper encoding of Arabic diacritics if needed.'
      }
    };

    return configs[targetLang] || configs['en'];
  }

  /**
   * 增强的JSON响应解析，支持所有字符集
   */
  parseTranslationResponse(responseContent, originalTexts, targetLang, config) {
    // Step 1: Clean response content and handle different character encodings
    let cleanContent = responseContent;

    // Remove potential markdown formatting that might interfere
    cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/i, '');

    // Step 2: Extract JSON array with improved regex for all character sets
    // This regex handles Unicode characters properly including RTL and CJK
    const jsonMatch = cleanContent.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/s);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in response for ${config.name}`);
    }

    let jsonString = jsonMatch[0];

    // Step 3: Validate JSON structure before parsing
    // Check for proper Unicode escaping and character encoding
    try {
      // Pre-validate: ensure the string can handle the target character set
      if (config.script === 'Arabic') {
        // Validate Arabic text direction and character encoding
        this.validateArabicJSON(jsonString);
      } else if (config.script.includes('Hiragana') || config.script.includes('Kanji')) {
        // Validate CJK character encoding
        this.validateCJKJSON(jsonString);
      } else if (config.script === 'Cyrillic') {
        // Validate Cyrillic character encoding
        this.validateCyrillicJSON(jsonString);
      }

      // Parse JSON with proper error handling for character encoding issues
      const translations = JSON.parse(jsonString);

      // Step 4: Validate structure and content
      if (!Array.isArray(translations)) {
        throw new Error(`Response is not an array for ${config.name}`);
      }

      if (translations.length !== originalTexts.length) {
        throw new Error(`Array length mismatch for ${config.name}: expected ${originalTexts.length}, got ${translations.length}`);
      }

      // Step 5: Process and validate each translation
      const processedTranslations = translations.map((translation, index) => {
        if (typeof translation !== 'string') {
          logger.warn(`Non-string translation at index ${index} for ${config.name}, using original text`);
          return originalTexts[index] || '';
        }

        // Handle empty markers
        if (translation === '[EMPTY]' || translation === '[EMPTY_INPUT]') {
          return '';
        }

        // Language-specific post-processing
        return this.postProcessTranslation(translation, targetLang, config);
      });

      return processedTranslations;

    } catch (jsonError) {
      throw new Error(`JSON parsing failed for ${config.name}: ${jsonError.message}`);
    }
  }

  /**
   * 语言特定的JSON验证方法
   */
  validateArabicJSON(jsonString) {
    // Check for proper Arabic character encoding and RTL markers
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasArabic = arabicPattern.test(jsonString);

    if (hasArabic) {
      // Ensure proper Unicode escaping for Arabic characters
      const invalidEscapes = /\\u[0-9a-fA-F]{0,3}[^0-9a-fA-F]/g;
      if (invalidEscapes.test(jsonString)) {
        throw new Error('Invalid Unicode escaping detected in Arabic text');
      }
    }
  }

  validateCJKJSON(jsonString) {
    // Check for proper CJK character encoding
    const cjkPattern = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
    const hasCJK = cjkPattern.test(jsonString);

    if (hasCJK) {
      // Ensure proper Unicode escaping for CJK characters
      const invalidEscapes = /\\u[0-9a-fA-F]{0,3}[^0-9a-fA-F]/g;
      if (invalidEscapes.test(jsonString)) {
        throw new Error('Invalid Unicode escaping detected in CJK text');
      }
    }
  }

  validateCyrillicJSON(jsonString) {
    // Check for proper Cyrillic character encoding
    const cyrillicPattern = /[\u0400-\u04FF\u0500-\u052F]/;
    const hasCyrillic = cyrillicPattern.test(jsonString);

    if (hasCyrillic) {
      // Ensure proper Unicode escaping for Cyrillic characters
      const invalidEscapes = /\\u[0-9a-fA-F]{0,3}[^0-9a-fA-F]/g;
      if (invalidEscapes.test(jsonString)) {
        throw new Error('Invalid Unicode escaping detected in Cyrillic text');
      }
    }
  }

  /**
   * 语言特定的翻译后处理
   */
  postProcessTranslation(translation, targetLang, config) {
    let processed = translation.trim();

    // Language-specific post-processing
    switch (targetLang) {
      case 'ar':
        // For Arabic: ensure proper RTL formatting and remove any LTR markers
        processed = processed.replace(/\u200E/g, ''); // Remove LTR marks
        processed = processed.replace(/\u200F/g, ''); // Remove RTL marks (will be added by display layer)
        break;

      case 'ja':
        // For Japanese: ensure proper character mix and spacing
        processed = processed.replace(/\s+/g, ''); // Remove extra spaces in Japanese
        break;

      case 'ko':
        // For Korean: ensure proper Hangul spacing
        processed = processed.replace(/\s+/g, ' ').trim(); // Normalize spacing
        break;

      case 'ru':
        // For Russian: ensure proper Cyrillic character normalization
        processed = processed.normalize('NFC'); // Normalize Cyrillic characters
        break;

      default:
        // For Latin-based languages: standard processing
        processed = processed.replace(/\s+/g, ' ').trim();
    }

    return processed;
  }

  /**
   * 增强的回退解析，支持多语言
   */
  parseTranslationFallback(responseContent, originalTexts, targetLang, config) {
    logger.info(`Attempting fallback parsing for ${config.name}`);

    // Try different fallback strategies based on language
    const strategies = [
      () => this.fallbackParseByLines(responseContent, originalTexts, config),
      () => this.fallbackParseByQuotes(responseContent, originalTexts, config),
      () => this.fallbackParseByNumbers(responseContent, originalTexts, config)
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && result.length === originalTexts.length) {
          logger.info(`Fallback strategy succeeded for ${config.name}`);
          return result;
        }
      } catch (strategyError) {
        logger.debug(`Fallback strategy failed for ${config.name}:`, strategyError.message);
        continue;
      }
    }

    throw new Error(`All fallback strategies failed for ${config.name}`);
  }

  fallbackParseByLines(responseContent, originalTexts, config) {
    const lines = responseContent.split('\n').filter(line => line.trim());
    const translations = [];

    for (let i = 0; i < originalTexts.length; i++) {
      let translation = originalTexts[i] || ''; // Default to original

      if (lines[i]) {
        // Remove common prefixes and clean up based on language
        translation = lines[i]
          .replace(/^\d+[\.\:\]\)\-\s]*/, '') // Remove numbering
          .replace(/^[\"\'\[\]]*/, '') // Remove quote marks
          .replace(/[\"\'\[\]]*$/, '') // Remove ending quotes
          .replace(/\[EMPTY\]/g, '') // Remove empty markers
          .replace(/\[EMPTY_INPUT\]/g, '')
          .trim();

        // Language-specific cleaning
        translation = this.postProcessTranslation(translation, config.targetLang, config);
      }

      translations.push(translation || originalTexts[i] || '');
    }

    return translations;
  }

  fallbackParseByQuotes(responseContent, originalTexts, config) {
    // Extract quoted strings that might contain translations
    const quotedPattern = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    const matches = [];
    let match;

    while ((match = quotedPattern.exec(responseContent)) !== null) {
      matches.push(match[1]);
    }

    if (matches.length === originalTexts.length) {
      return matches.map((translation, index) => {
        const processed = this.postProcessTranslation(translation, config.targetLang, config);
        return processed === '[EMPTY]' ? '' : processed;
      });
    }

    throw new Error('Quote-based parsing did not yield correct number of translations');
  }

  fallbackParseByNumbers(responseContent, originalTexts, config) {
    // Look for numbered list format: 1. Translation, 2. Translation, etc.
    const numberedPattern = /\d+\.\s*(.+)/g;
    const matches = [];
    let match;

    while ((match = numberedPattern.exec(responseContent)) !== null) {
      matches.push(match[1].trim());
    }

    if (matches.length === originalTexts.length) {
      return matches.map((translation, index) => {
        const processed = this.postProcessTranslation(translation, config.targetLang, config);
        return processed === '[EMPTY]' ? '' : processed;
      });
    }

    throw new Error('Number-based parsing did not yield correct number of translations');
  }

  /**
   * 创建语言感知的翻译提示
   */
  createLanguageAwarePrompt(texts, targetLang, sourceLang = 'Chinese') {
    const config = this.getLanguageConfig(targetLang);
    const inputTexts = texts.map((text, index) => ({
      index: index,
      original: text || '[EMPTY_INPUT]'
    }));

    // Language-specific examples for JSON format validation
    const examples = {
      'en': { input: '["你好", "世界", ""]', output: '["Hello", "World", "[EMPTY]"]' },
      'ja': { input: '["你好", "世界", ""]', output: '["こんにちは", "世界", "[EMPTY]"]' },
      'ko': { input: '["你好", "世界", ""]', output: '["안녕하세요", "세계", "[EMPTY]"]' },
      'es': { input: '["你好", "世界", ""]', output: '["Hola", "Mundo", "[EMPTY]"]' },
      'fr': { input: '["你好", "世界", ""]', output: '["Bonjour", "Monde", "[EMPTY]"]' },
      'de': { input: '["你好", "世界", ""]', output: '["Hallo", "Welt", "[EMPTY]"]' },
      'ru': { input: '["你好", "世界", ""]', output: '["Привет", "Мир", "[EMPTY]"]' },
      'ar': { input: '["你好", "世界", ""]', output: '["مرحبا", "العالم", "[EMPTY]"]' }
    };

    const example = examples[targetLang] || examples['en'];

    return `Translate the following ${sourceLang} texts to ${config.name} (${config.script} script).

LANGUAGE-SPECIFIC REQUIREMENTS FOR ${config.name.toUpperCase()}:
- Script: ${config.script}
- Text direction: ${config.direction.toUpperCase()}
- ${config.specialInstructions}

CRITICAL JSON OUTPUT REQUIREMENTS:
1. You MUST return ONLY a valid JSON array with UTF-8 encoding
2. NO additional text, explanations, comments, or formatting outside the JSON
3. EXACTLY ${texts.length} translations in the same order as input
4. Each array element must be a properly escaped JSON string
5. For empty inputs "[EMPTY_INPUT]", return "[EMPTY]"
6. Preserve all special characters with proper JSON escaping
7. Ensure compatibility with JSON.parse() for ${config.script} characters

INPUT TEXTS TO TRANSLATE:
${inputTexts.map(item => `[${item.index}]: ${item.original}`).join('\n')}

REQUIRED OUTPUT FORMAT (exactly like this structure):
["translation1", "translation2", "translation3", ...]

EXAMPLE FOR ${config.name.toUpperCase()}:
Input: ${example.input}
Output: ${example.output}

IMPORTANT: Your response must be valid JSON that can be parsed by JSON.parse() with proper ${config.script} character encoding.`;
  }

  /**
   * 使用OpenAI翻译文本 - 增强的多语言版本
   */
  async translateWithOpenAI(texts, targetLang, sourceLang = 'Chinese') {
    if (!this.openai) {
      logger.warn('OpenAI API key not configured, skipping translation');
      return texts; // 返回原文
    }

    try {
      const config = this.getLanguageConfig(targetLang);
      const prompt = this.createLanguageAwarePrompt(texts, targetLang, sourceLang);

      // Language-specific system message
      const systemMessage = `You are a professional translator specializing in ${config.name} (${config.script} script).

CRITICAL REQUIREMENTS:
1. Output ONLY valid JSON arrays with proper UTF-8 encoding
2. Never include explanations, headers, markdown, or any text outside the JSON array
3. Return exactly ${texts.length} string elements in the array
4. Preserve exact input order (index 0 → array[0], index 1 → array[1], etc.)
5. Handle ${config.script} characters with proper JSON string escaping
6. For ${config.direction} languages, ensure proper text direction in output
7. Apply ${config.name} cultural and linguistic conventions

Your output will be parsed by JSON.parse() - ensure it's valid JSON!`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        // Ensure UTF-8 encoding for all character sets
        encoding: 'utf-8'
      });

      const responseContent = response.choices[0].message.content.trim();

      // Enhanced JSON validation for all character sets
      let translations;
      try {
        translations = this.parseTranslationResponse(responseContent, texts, targetLang, config);

      } catch (parseError) {
        logger.error(`JSON parsing error for ${targetLang}:`, parseError.message);
        logger.error('Raw response:', responseContent);

        // Enhanced fallback with language-aware parsing
        try {
          translations = this.parseTranslationFallback(responseContent, texts, targetLang, config);
        } catch (fallbackError) {
          logger.error(`Fallback parsing also failed for ${targetLang}:`, fallbackError.message);
          return texts; // Return original texts as last resort
        }
      }

      // Final validation
      if (translations.length !== texts.length) {
        logger.warn(`Final translation count mismatch for ${targetLang}: expected ${texts.length}, got ${translations.length}`);

        // Ensure we return exactly the right number of items
        const adjustedTranslations = [];
        for (let i = 0; i < texts.length; i++) {
          adjustedTranslations.push(translations[i] || texts[i] || '');
        }
        return adjustedTranslations;
      }

      logger.info(`Successfully translated ${translations.length} texts to ${targetLang}`);
      return translations;

    } catch (error) {
      logger.error(`OpenAI translation error (${targetLang}):`, error.message);
      return texts; // 失败时返回原文
    }
  }

  /**
   * 批量翻译热门话题
   */
  async translateBatch(items, targetLang) {
    if (!items || items.length === 0) return [];

    // 提取需要翻译的文本
    const titles = items.map(item => item.title || '');

    try {
      // 批量翻译标题
      const translatedTitles = await this.translateWithOpenAI(titles, targetLang);

      // 组合翻译结果
      return items.map((item, index) => ({
        platform: item.platform,
        content_hash: item.content_hash,
        original_title: item.title,
        translated_title: translatedTitles[index] || item.title,
        rank: item.rank,
        url: item.url,
        hot_value: item.hot_value,
        category: item.category,
        original_data: item.original_data
      }));
    } catch (error) {
      logger.error(`Batch translation error (${targetLang}):`, error);
      return items.map(item => ({
        platform: item.platform,
        content_hash: item.content_hash,
        original_title: item.title,
        translated_title: item.title, // 失败时使用原文
        rank: item.rank,
        url: item.url,
        hot_value: item.hot_value,
        category: item.category,
        original_data: item.original_data
      }));
    }
  }

  /**
   * 保存翻译到指定语言表
   */
  async saveTranslations(tableName, translations) {
    if (!translations || translations.length === 0) {
      return { saved: 0, errors: 0 };
    }

    try {
      // 使用upsert避免重复
      const { data, error } = await supabase
        .from(tableName)
        .upsert(translations, {
          onConflict: 'platform,content_hash',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        logger.error(`Error saving to ${tableName}:`, error);
        return { saved: 0, errors: translations.length };
      }

      const savedCount = data ? data.length : 0;
      logger.info(`Saved ${savedCount} translations to ${tableName}`);
      return { saved: savedCount, errors: 0 };
    } catch (error) {
      logger.error(`Database error saving translations to ${tableName}:`, error);
      return { saved: 0, errors: translations.length };
    }
  }

  /**
   * 处理平台数据的翻译（翻译到所有支持的语言）
   */
  async translatePlatformData(platform, items, contentHashes) {
    try {
      logger.info(`Starting translation for ${platform} with ${items.length} items`);

      // 准备要翻译的数据
      const itemsToTranslate = items.map((item, index) => ({
        platform,
        content_hash: contentHashes[index],
        title: item.title,
        rank: item.pos || item.position || index + 1,
        url: item.to_url || item.toUrl || item.url || '',
        hot_value: parseInt(item.hot_val || item.hotVal || '0') || null,
        category: item.lab || item.label || null,
        original_data: {
          description: item.desc || item.description || '',
          icon: item.icon || '',
          is_top: item.is_top || item.isTop || 0
        }
      }));

      let totalTranslated = 0;
      let totalErrors = 0;

      // 翻译到每种目标语言
      for (const [langCode, tableName] of Object.entries(this.targetLanguages)) {
        try {
          logger.info(`Translating ${platform} to ${langCode}`);

          // 批量翻译
          const translations = await this.translateBatch(itemsToTranslate, langCode);

          // 保存到对应的语言表
          const saveResult = await this.saveTranslations(tableName, translations);
          totalTranslated += saveResult.saved;
          totalErrors += saveResult.errors;

          // 添加延迟避免API限制
          if (this.openai) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          logger.error(`Translation failed for ${platform} to ${langCode}:`, error);
          totalErrors += items.length;
        }
      }

      return {
        platform,
        translated: totalTranslated,
        errors: totalErrors
      };
    } catch (error) {
      logger.error(`Translation failed for ${platform}:`, error);
      return {
        platform,
        translated: 0,
        errors: items.length * Object.keys(this.targetLanguages).length,
        error: error.message
      };
    }
  }
}

module.exports = TranslationService;