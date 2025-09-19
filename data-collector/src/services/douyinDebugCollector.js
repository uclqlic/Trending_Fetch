const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');
const { supabase } = require('../config/database');

class DouyinDebugCollector {
  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/hot';
  }

  generateContentHash(title, url = '') {
    const content = `${title}${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async collectDouyin() {
    const startTime = Date.now();
    const debugInfo = {
      platform: 'douyin',
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // Step 1: Fetch data from API
      debugInfo.steps.push({ step: 'fetch_api', time: new Date().toISOString() });
      logger.info('[DOUYIN DEBUG] Fetching data from API...');

      const url = `${this.apiBaseUrl}/douyin`;
      logger.info(`[DOUYIN DEBUG] API URL: ${url}`);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'DataCollector/1.0'
        }
      });

      if (!response.data || response.data.code !== 0 || !response.data.data) {
        const error = `Invalid API response: code=${response.data?.code}`;
        logger.error(`[DOUYIN DEBUG] ${error}`);
        debugInfo.steps.push({ step: 'api_error', error });
        return { status: 'failed', error, debugInfo };
      }

      const apiData = response.data.data;
      logger.info(`[DOUYIN DEBUG] Received ${apiData.length} items from API`);
      debugInfo.steps.push({
        step: 'api_success',
        itemCount: apiData.length,
        sampleTitle: apiData[0]?.title
      });

      // Step 2: Prepare records
      debugInfo.steps.push({ step: 'prepare_records', time: new Date().toISOString() });
      logger.info('[DOUYIN DEBUG] Preparing records...');

      const records = [];
      const contentHashes = [];

      apiData.forEach((item, index) => {
        const contentHash = this.generateContentHash(
          item.title || '',
          item.to_url || item.toUrl || item.url || ''
        );

        contentHashes.push(contentHash);

        const record = {
          platform: 'douyin', // 明确添加 platform 字段
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

      logger.info(`[DOUYIN DEBUG] Prepared ${records.length} records`);
      logger.info(`[DOUYIN DEBUG] Sample content_hash: ${contentHashes[0]}`);
      debugInfo.steps.push({
        step: 'records_prepared',
        recordCount: records.length,
        sampleHash: contentHashes[0]
      });

      // Step 3: Check existing records
      debugInfo.steps.push({ step: 'check_existing', time: new Date().toISOString() });
      logger.info('[DOUYIN DEBUG] Checking existing records...');

      const { data: existingRecords, error: checkError } = await supabase
        .from('trending_douyin')
        .select('content_hash')
        .in('content_hash', contentHashes.slice(0, 5)); // 检查前5个

      if (checkError) {
        logger.error(`[DOUYIN DEBUG] Error checking existing records: ${checkError.message}`);
        debugInfo.steps.push({ step: 'check_error', error: checkError.message });
      } else {
        const existingHashes = existingRecords ? existingRecords.map(r => r.content_hash) : [];
        logger.info(`[DOUYIN DEBUG] Found ${existingHashes.length} existing hashes out of 5 checked`);
        debugInfo.steps.push({
          step: 'existing_checked',
          existingCount: existingHashes.length
        });
      }

      // Step 4: Save to database
      debugInfo.steps.push({ step: 'save_database', time: new Date().toISOString() });
      logger.info('[DOUYIN DEBUG] Saving to database...');
      logger.info(`[DOUYIN DEBUG] Table name: trending_douyin`);

      const { data: savedData, error: saveError } = await supabase
        .from('trending_douyin')
        .upsert(records, {
          onConflict: 'content_hash',
          ignoreDuplicates: true
        })
        .select();

      if (saveError) {
        logger.error(`[DOUYIN DEBUG] Database save error: ${saveError.message}`);
        logger.error(`[DOUYIN DEBUG] Error details: ${JSON.stringify(saveError)}`);
        debugInfo.steps.push({
          step: 'save_error',
          error: saveError.message,
          errorDetails: saveError
        });

        // 尝试插入单条记录以获取更详细的错误
        logger.info('[DOUYIN DEBUG] Attempting single record insert for debugging...');
        const { error: singleError } = await supabase
          .from('trending_douyin')
          .insert(records[0]);

        if (singleError) {
          logger.error(`[DOUYIN DEBUG] Single insert error: ${singleError.message}`);
          debugInfo.steps.push({
            step: 'single_insert_error',
            error: singleError.message
          });
        }

        return {
          status: 'failed',
          error: saveError.message,
          itemsCollected: 0,
          debugInfo
        };
      }

      const savedCount = savedData ? savedData.length : 0;
      logger.info(`[DOUYIN DEBUG] Successfully saved ${savedCount} new items`);
      debugInfo.steps.push({
        step: 'save_success',
        savedCount,
        totalRecords: records.length
      });

      // Step 5: Log collection
      const duration = Date.now() - startTime;
      await this.logCollection('douyin', 'success', savedCount, 0, null, duration);

      logger.info(`[DOUYIN DEBUG] Collection completed in ${duration}ms`);
      debugInfo.steps.push({
        step: 'completed',
        duration,
        finalStatus: 'success'
      });

      return {
        platform: 'douyin',
        status: 'success',
        itemsCollected: savedCount,
        totalItems: records.length,
        duration,
        debugInfo
      };

    } catch (error) {
      logger.error(`[DOUYIN DEBUG] Unexpected error: ${error.message}`);
      logger.error(`[DOUYIN DEBUG] Stack: ${error.stack}`);

      debugInfo.steps.push({
        step: 'unexpected_error',
        error: error.message,
        stack: error.stack
      });

      const duration = Date.now() - startTime;
      await this.logCollection('douyin', 'failed', 0, 0, error, duration);

      return {
        platform: 'douyin',
        status: 'failed',
        error: error.message,
        itemsCollected: 0,
        duration,
        debugInfo
      };
    }
  }

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
      logger.error(`[DOUYIN DEBUG] Error logging collection: ${err.message}`);
    }
  }
}

module.exports = DouyinDebugCollector;