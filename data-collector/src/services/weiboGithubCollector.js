const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');
const { supabase } = require('../config/database');

class WeiboGithubCollector {
  constructor() {
    // GitHub README URL
    this.githubUrl = 'https://raw.githubusercontent.com/justjavac/weibo-trending-hot-search/master/README.md';
  }

  /**
   * 生成内容哈希
   */
  generateContentHash(title, url = '') {
    const content = `weibo:${title}${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 从GitHub README获取微博热搜数据
   */
  async fetchFromGithub() {
    try {
      logger.info('Fetching Weibo data from GitHub README');

      const response = await axios.get(this.githubUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DataCollector/1.0)',
          'Accept': 'text/plain, text/markdown, */*'
        }
      });

      if (!response.data) {
        throw new Error('Empty response from GitHub');
      }

      // 解析README内容
      return this.parseReadmeContent(response.data);

    } catch (error) {
      logger.error('Failed to fetch from GitHub:', error.message);
      throw error;
    }
  }

  /**
   * 解析README内容提取热搜数据
   */
  parseReadmeContent(content) {
    const items = [];

    // 找到热搜列表部分（在 <!-- BEGIN --> 和 <!-- END --> 之间）
    const beginMatch = content.indexOf('<!-- BEGIN -->');
    const endMatch = content.indexOf('<!-- END -->', beginMatch);

    if (beginMatch === -1 || endMatch === -1) {
      logger.warn('Could not find BEGIN/END markers in README');
      return items;
    }

    const hotSearchSection = content.substring(beginMatch, endMatch);

    // 使用正则匹配每一行热搜
    // 格式: 1. [标题](链接)
    const regex = /^\d+\.\s*\[([^\]]+)\]\(([^)]+)\)/gm;
    let match;
    let rank = 0;

    while ((match = regex.exec(hotSearchSection)) !== null) {
      rank++;
      const title = match[1];
      const url = match[2];

      // 提取热度值（如果URL中包含band_rank参数）
      let hotValue = null;
      const bandRankMatch = url.match(/band_rank=(\d+)/);
      if (bandRankMatch) {
        hotValue = parseInt(bandRankMatch[1]) * 10000; // 转换为近似热度值
      }

      items.push({
        rank,
        title,
        url: url.startsWith('http') ? url : `https://s.weibo.com${url}`,
        hot_value: hotValue || (51 - rank) * 100000, // 根据排名生成默认热度
        category: '热搜',
        description: '',
        pubDate: new Date().toISOString()
      });
    }

    logger.info(`Parsed ${items.length} items from GitHub README`);
    return items.slice(0, 50); // 返回前50条
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
          source: 'github'
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
      logger.info('Starting Weibo GitHub collection');

      // 1. 获取GitHub数据
      const items = await this.fetchFromGithub();

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
        error = new Error('No data returned from GitHub');
      }
    } catch (err) {
      status = 'failed';
      error = err;
      logger.error('Weibo GitHub collection failed:', err);
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

module.exports = WeiboGithubCollector;