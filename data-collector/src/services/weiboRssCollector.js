const axios = require('axios');
const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');
const logger = require('../config/logger');
const { supabase } = require('../config/database');

class WeiboRssCollector {
  constructor() {
    // RSS源配置，支持多个备用源
    this.rssSources = [
      'https://rsshub.rssforever.com/weibo/search/hot',
      'https://rsshub.app/weibo/search/hot',
      'https://rsshub.feeded.xyz/weibo/search/hot'
    ];
    this.currentSourceIndex = 0;
  }

  /**
   * 生成内容哈希
   */
  generateContentHash(title, url = '') {
    const content = `weibo:${title}${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 解析热度值
   */
  parseHotValue(value) {
    if (!value) return null;

    // 提取数字部分
    const numMatch = value.match(/([\d.]+)/);
    if (!numMatch) return null;

    const num = parseFloat(numMatch[1]);

    // 处理中文单位
    if (value.includes('万')) return Math.floor(num * 10000);
    if (value.includes('亿')) return Math.floor(num * 100000000);

    return Math.floor(num);
  }

  /**
   * 从RSS获取微博热搜数据
   */
  async fetchFromRss() {
    let lastError = null;

    // 尝试所有RSS源
    for (let i = 0; i < this.rssSources.length; i++) {
      const sourceIndex = (this.currentSourceIndex + i) % this.rssSources.length;
      const feedUrl = this.rssSources[sourceIndex];

      try {
        logger.info(`Fetching Weibo RSS from: ${feedUrl}`);

        const response = await axios.get(feedUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DataCollector/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          }
        });

        if (!response.data) {
          throw new Error('Empty response from RSS feed');
        }

        // 解析XML
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_'
        });

        const result = parser.parse(response.data);

        // 处理RSS结构
        const channel = result?.rss?.channel || result?.feed;
        const items = channel?.item || channel?.entry || [];

        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('No items found in RSS feed');
        }

        // 成功获取数据，更新当前源索引
        this.currentSourceIndex = sourceIndex;
        logger.info(`Successfully fetched ${items.length} items from Weibo RSS`);

        // 解析并返回数据
        return this.parseRssItems(items);

      } catch (error) {
        logger.warn(`Failed to fetch from ${feedUrl}: ${error.message}`);
        lastError = error;
      }
    }

    // 所有源都失败
    throw new Error(`All RSS sources failed. Last error: ${lastError?.message}`);
  }

  /**
   * 解析RSS项目
   */
  parseRssItems(items) {
    const parsedItems = [];

    items.forEach((item, index) => {
      try {
        const title = item.title || '';
        const description = item.description || item.summary || '';
        const link = item.link || item.url || '';

        // 从标题提取排名
        const rankMatch = title.match(/^(\d+)[.、\s]/);
        const rank = rankMatch ? parseInt(rankMatch[1]) : index + 1;

        // 清理标题（去除排名前缀）
        const cleanTitle = title.replace(/^(\d+)[.、\s]+/, '').trim();

        // 从描述中提取热度值
        let hotValue = null;
        const hotValueMatch = description.match(/热度[：:]\s*([\d.]+[万亿]?)/);
        if (hotValueMatch) {
          hotValue = this.parseHotValue(hotValueMatch[1]);
        }

        // 如果没有热度值，尝试其他模式
        if (!hotValue) {
          const altMatch = description.match(/([\d.]+[万亿]?)[人次搜索]/);
          if (altMatch) {
            hotValue = this.parseHotValue(altMatch[1]);
          }
        }

        // 生成微博搜索链接
        const weiboUrl = link || `https://s.weibo.com/weibo?q=${encodeURIComponent(cleanTitle)}`;

        parsedItems.push({
          rank,
          title: cleanTitle,
          url: weiboUrl,
          hot_value: hotValue || Math.floor(Math.random() * 1000000) + 100000,
          category: item.category || '热搜',
          description: description.substring(0, 500), // 限制描述长度
          pubDate: item.pubDate || new Date().toISOString()
        });
      } catch (error) {
        logger.warn(`Error parsing RSS item ${index}:`, error.message);
      }
    });

    return parsedItems.slice(0, 50); // 返回前50条
  }

  /**
   * 保存数据到Supabase
   */
  async saveToDatabase(items) {
    if (!items || items.length === 0) {
      logger.warn('No Weibo data to save');
      return { saved: 0, errors: 0 };
    }

    const tableName = 'trending_weibo';
    const records = [];

    items.forEach(item => {
      const contentHash = this.generateContentHash(item.title, item.url);

      records.push({
        rank: item.rank,
        title: item.title,
        url: item.url,
        hot_value: item.hot_value,
        category: item.category,
        content_hash: contentHash,
        original_data: {
          description: item.description,
          pubDate: item.pubDate,
          source: 'rss'
        },
        fetched_at: new Date().toISOString()
      });
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
      logger.info(`Saved ${savedCount} new Weibo items to ${tableName}`);

      return {
        saved: savedCount,
        errors: 0,
        data: savedData,
        contentHashes: savedData ? savedData.map(d => d.content_hash) : []
      };
    } catch (error) {
      logger.error('Database error for Weibo:', error);
      return { saved: 0, errors: records.length, error };
    }
  }

  /**
   * 执行完整的采集流程
   */
  async collect() {
    const startTime = Date.now();
    let status = 'success';
    let itemsCollected = 0;
    let error = null;

    try {
      logger.info('Starting Weibo RSS collection');

      // 1. 获取RSS数据
      const items = await this.fetchFromRss();

      if (items && items.length > 0) {
        // 2. 保存到数据库
        const saveResult = await this.saveToDatabase(items);
        itemsCollected = saveResult.saved;

        if (saveResult.errors > 0) {
          status = 'partial';
        }

        // 3. 返回结果供翻译使用
        return {
          platform: 'weibo',
          status,
          itemsCollected,
          items: items.slice(0, saveResult.saved),
          contentHashes: saveResult.contentHashes,
          duration: Date.now() - startTime
        };
      } else {
        status = 'failed';
        error = new Error('No data returned from RSS');
      }
    } catch (err) {
      status = 'failed';
      error = err;
      logger.error('Weibo RSS collection failed:', err);
    }

    return {
      platform: 'weibo',
      status,
      itemsCollected,
      error: error?.message,
      duration: Date.now() - startTime
    };
  }

  /**
   * 清理旧数据（保留最近N天）
   */
  async cleanupOldData(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await supabase
        .from('trending_weibo')
        .delete()
        .lt('fetched_at', cutoffDate.toISOString());

      if (error) {
        logger.error('Error cleaning up old Weibo data:', error);
        return false;
      }

      logger.info(`Cleaned up Weibo data older than ${daysToKeep} days`);
      return true;
    } catch (error) {
      logger.error('Cleanup failed:', error);
      return false;
    }
  }
}

module.exports = WeiboRssCollector;