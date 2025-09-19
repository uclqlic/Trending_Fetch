const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');
const { supabase } = require('../config/database');

class DataCollector {
  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/hot';
    this.platforms = (process.env.PLATFORMS || 'baidu,toutiao,douban,xhs,36kr,juejin,ithome,weibo').split(',');

    // 初始化Weibo RSS采集器
    const WeiboRssCollector = require('./weiboRssCollector');
    this.weiboCollector = new WeiboRssCollector();
  }

  /**
   * 生成内容哈希
   */
  generateContentHash(title, url = '') {
    const content = `${title}${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 从API获取平台数据
   */
  async fetchPlatformData(platform) {
    try {
      // 大部分平台直接使用平台名作为API路径
      // 特殊情况：zhihu需要使用v2版本（但目前API返回错误）
      let apiPath = platform;

      const url = `${this.apiBaseUrl}/${apiPath}`;
      logger.info(`Fetching data from ${url}`);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'DataCollector/1.0'
        }
      });

      if (response.data && response.data.code === 0 && response.data.data) {
        return response.data.data;
      }

      logger.warn(`No data returned for platform ${platform}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching data for ${platform}:`, error.message);
      throw error;
    }
  }

  /**
   * 保存数据到Supabase（使用现有表结构）
   */
  async saveToDatabase(platform, data) {
    if (!data || data.length === 0) {
      logger.warn(`No data to save for platform ${platform}`);
      return { saved: 0, errors: 0 };
    }

    // 直接使用平台名构建表名，因为表名已经改为trending_bili
    const tableName = `trending_${platform}`;
    const records = [];

    data.forEach((item, index) => {
      // 生成内容哈希
      const contentHash = this.generateContentHash(
        item.title || '',
        item.to_url || item.toUrl || item.url || ''
      );

      const record = {
        rank: item.pos || item.position || index + 1,
        title: item.title || '',
        url: item.to_url || item.toUrl || item.url || '',
        hot_value: parseInt(item.hot_val || item.hotVal || '0') || null,
        category: item.lab || item.label || null,
        content_hash: contentHash,
        original_data: {
          description: item.desc || item.description || '',
          icon: item.icon || '',
          is_top: item.is_top || item.isTop || 0,
          raw_hot_val: item.hot_val || item.hotVal || ''
        },
        fetched_at: new Date().toISOString()
      };

      records.push(record);
    });

    try {
      // 使用upsert避免重复数据
      const { data: savedData, error } = await supabase
        .from(tableName)
        .upsert(records, {
          onConflict: 'content_hash',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        logger.error(`Error saving to ${tableName}:`, error);
        return { saved: 0, errors: records.length, error };
      }

      const savedCount = savedData ? savedData.length : 0;
      logger.info(`Saved ${savedCount} new items to ${tableName}`);
      return {
        saved: savedCount,
        errors: 0,
        data: savedData,
        contentHashes: savedData ? savedData.map(d => d.content_hash) : []
      };
    } catch (error) {
      logger.error(`Database error for ${platform}:`, error);
      return { saved: 0, errors: records.length, error };
    }
  }

  /**
   * 记录采集日志
   */
  async logCollection(platform, status, itemsCollected, itemsTranslated, error, duration) {
    try {
      await supabase.from('collection_logs').insert({
        platform,
        status,
        items_collected: itemsCollected,
        items_translated: itemsTranslated,
        error_message: error ? error.message : null,
        duration_ms: duration
      });
    } catch (err) {
      logger.error('Error logging collection:', err);
    }
  }

  /**
   * 收集单个平台的数据
   */
  async collectPlatform(platform) {
    const startTime = Date.now();
    let status = 'success';
    let itemsCollected = 0;
    let itemsTranslated = 0;
    let error = null;

    try {
      logger.info(`Starting collection for ${platform}`);

      // 获取数据
      const data = await this.fetchPlatformData(platform);

      if (data) {
        // 保存到数据库
        const saveResult = await this.saveToDatabase(platform, data);
        itemsCollected = saveResult.saved;

        if (saveResult.errors > 0) {
          status = 'partial';
        }

        // 触发翻译任务（如果有新数据保存成功）
        if (saveResult.saved > 0 && saveResult.contentHashes) {
          const translationResult = await this.triggerTranslation(
            platform,
            data.slice(0, saveResult.saved),
            saveResult.contentHashes
          );
          itemsTranslated = translationResult.translated || 0;
        }
      } else {
        status = 'failed';
        error = new Error('No data returned from API');
      }
    } catch (err) {
      status = 'failed';
      error = err;
      logger.error(`Collection failed for ${platform}:`, err);
    }

    const duration = Date.now() - startTime;
    await this.logCollection(platform, status, itemsCollected, itemsTranslated, error, duration);

    return {
      platform,
      status,
      itemsCollected,
      itemsTranslated,
      duration
    };
  }

  /**
   * 从RSS采集Weibo数据
   */
  async collectWeiboFromRss() {
    try {
      logger.info('Starting Weibo RSS collection');

      // 使用Weibo RSS采集器
      const result = await this.weiboCollector.collect();

      // 如果有数据，触发翻译
      if (result.itemsCollected > 0 && result.items && result.contentHashes) {
        const translationResult = await this.triggerTranslation(
          'weibo',
          result.items,
          result.contentHashes
        );
        result.itemsTranslated = translationResult.translated || 0;
      }

      // 记录采集日志
      await this.logCollection(
        'weibo',
        result.status,
        result.itemsCollected,
        result.itemsTranslated || 0,
        result.error ? new Error(result.error) : null,
        result.duration
      );

      return result;
    } catch (error) {
      logger.error('Weibo RSS collection failed:', error);

      const duration = 0;
      await this.logCollection('weibo', 'failed', 0, 0, error, duration);

      return {
        platform: 'weibo',
        status: 'failed',
        itemsCollected: 0,
        itemsTranslated: 0,
        error: error.message,
        duration
      };
    }
  }

  /**
   * 触发翻译任务
   */
  async triggerTranslation(platform, items, contentHashes) {
    const TranslationService = require('./translator');
    const translator = new TranslationService();

    try {
      const result = await translator.translatePlatformData(platform, items, contentHashes);
      logger.info(`Translation completed for ${platform}:`, result);
      return result;
    } catch (error) {
      logger.error(`Translation failed for ${platform}:`, error);
      return { translated: 0, errors: items.length };
    }
  }

  /**
   * 收集所有平台数据
   */
  async collectAll() {
    logger.info('Starting data collection for all platforms');
    const results = [];

    for (const platform of this.platforms) {
      try {
        const result = await this.collectPlatform(platform);
        results.push(result);

        // 添加延迟避免过快请求
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Failed to collect ${platform}:`, error);
        results.push({
          platform,
          status: 'failed',
          error: error.message
        });
      }
    }

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalItems: results.reduce((sum, r) => sum + (r.itemsCollected || 0), 0),
      totalTranslated: results.reduce((sum, r) => sum + (r.itemsTranslated || 0), 0),
      results
    };

    logger.info('Collection completed:', summary);
    return summary;
  }
}

module.exports = DataCollector;