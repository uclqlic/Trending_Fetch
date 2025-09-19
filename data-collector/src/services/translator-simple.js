const OpenAI = require('openai');
const logger = require('../config/logger');
const { supabase } = require('../config/database');

class TranslationService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.openai = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
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

  async translateWithOpenAI(texts, targetLang, sourceLang = 'Chinese') {
    if (!this.openai) {
      logger.warn('OpenAI API key not configured, skipping translation');
      return texts;
    }

    try {
      const langNames = {
        'ar': 'Arabic',
        'en': 'English',
        'ja': 'Japanese'
      };

      const prompt = `Translate the following ${sourceLang} texts to ${langNames[targetLang]}.
Return only the translations, maintaining the same order and structure.

Texts to translate:
${texts.map((t, i) => `${i + 1}. ${t || '[empty]'}`).join('\n')}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate accurately while maintaining the meaning and context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const translatedText = response.choices[0].message.content;
      const translations = translatedText.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').replace('[empty]', ''));

      return translations;
    } catch (error) {
      logger.error(`OpenAI translation error (${targetLang}):`, error.message);
      return texts;
    }
  }

  async translateBatch(items, targetLang) {
    if (!items || items.length === 0) return [];

    const titles = items.map(item => item.title || '');

    try {
      const translatedTitles = await this.translateWithOpenAI(titles, targetLang);

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
        translated_title: item.title,
        rank: item.rank,
        url: item.url,
        hot_value: item.hot_value,
        category: item.category,
        original_data: item.original_data
      }));
    }
  }

  async saveTranslations(tableName, translations) {
    if (!translations || translations.length === 0) {
      return { saved: 0, errors: 0 };
    }

    try {
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

  async translatePlatformData(platform, items, contentHashes) {
    try {
      logger.info(`Starting translation for ${platform} with ${items.length} items`);

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

      for (const [langCode, tableName] of Object.entries(this.targetLanguages)) {
        try {
          logger.info(`Translating ${platform} to ${langCode}`);

          const translations = await this.translateBatch(itemsToTranslate, langCode);
          const saveResult = await this.saveTranslations(tableName, translations);
          totalTranslated += saveResult.saved;
          totalErrors += saveResult.errors;

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