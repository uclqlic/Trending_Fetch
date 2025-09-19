const { supabase } = require('../config/database');
const logger = require('../config/logger');

class BatchJobService {
  /**
   * 创建新的批次任务记录
   */
  async createBatchJob(jobType, platforms = []) {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .insert({
          job_type: jobType,
          status: 'pending',
          platforms_processed: [],
          total_items: 0,
          metadata: {
            scheduled_platforms: platforms,
            start_time: new Date().toISOString()
          },
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating batch job:', error);
        throw error;
      }

      logger.info(`Created batch job ${data.id} for ${jobType}`);
      return data;
    } catch (error) {
      logger.error('Failed to create batch job:', error);
      throw error;
    }
  }

  /**
   * 更新批次任务状态
   */
  async updateBatchJob(jobId, updates) {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        logger.error(`Error updating batch job ${jobId}:`, error);
        throw error;
      }

      logger.debug(`Updated batch job ${jobId}:`, updates);
      return data;
    } catch (error) {
      logger.error(`Failed to update batch job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * 标记批次任务开始处理
   */
  async startBatchJob(jobId) {
    return this.updateBatchJob(jobId, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  /**
   * 更新平台处理进度
   */
  async updatePlatformProgress(jobId, platform, items, metadata = {}) {
    try {
      // 获取当前批次任务
      const { data: currentJob, error: fetchError } = await supabase
        .from('batch_jobs')
        .select('platforms_processed, total_items, metadata')
        .eq('id', jobId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // 更新处理的平台列表和总项目数
      const platformsProcessed = currentJob.platforms_processed || [];
      if (!platformsProcessed.includes(platform)) {
        platformsProcessed.push(platform);
      }

      const totalItems = (currentJob.total_items || 0) + items;

      // 合并metadata
      const updatedMetadata = {
        ...currentJob.metadata,
        [`${platform}_items`]: items,
        [`${platform}_processed_at`]: new Date().toISOString(),
        ...metadata
      };

      return this.updateBatchJob(jobId, {
        platforms_processed: platformsProcessed,
        total_items: totalItems,
        metadata: updatedMetadata
      });
    } catch (error) {
      logger.error(`Failed to update platform progress for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * 完成批次任务
   */
  async completeBatchJob(jobId, summary = {}) {
    try {
      const completedAt = new Date().toISOString();

      // 获取当前任务信息计算持续时间
      const { data: currentJob } = await supabase
        .from('batch_jobs')
        .select('started_at, metadata')
        .eq('id', jobId)
        .single();

      let duration = null;
      if (currentJob && currentJob.started_at) {
        duration = new Date(completedAt) - new Date(currentJob.started_at);
      }

      const metadata = {
        ...currentJob?.metadata,
        ...summary,
        duration_ms: duration,
        completed_time: completedAt
      };

      return this.updateBatchJob(jobId, {
        status: 'completed',
        completed_at: completedAt,
        metadata
      });
    } catch (error) {
      logger.error(`Failed to complete batch job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * 标记批次任务失败
   */
  async failBatchJob(jobId, error, partialResults = {}) {
    try {
      const { data: currentJob } = await supabase
        .from('batch_jobs')
        .select('metadata')
        .eq('id', jobId)
        .single();

      const metadata = {
        ...currentJob?.metadata,
        ...partialResults,
        error_message: error.message || error,
        error_stack: error.stack,
        failed_at: new Date().toISOString()
      };

      return this.updateBatchJob(jobId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        metadata
      });
    } catch (err) {
      logger.error(`Failed to mark batch job ${jobId} as failed:`, err);
      throw err;
    }
  }

  /**
   * 获取批次任务详情
   */
  async getBatchJob(jobId) {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Failed to get batch job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * 获取最近的批次任务
   */
  async getRecentBatchJobs(jobType = null, limit = 10) {
    try {
      let query = supabase
        .from('batch_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get recent batch jobs:', error);
      throw error;
    }
  }

  /**
   * 清理旧的批次任务记录（保留最近30天）
   */
  async cleanupOldJobs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('batch_jobs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        throw error;
      }

      logger.info(`Cleaned up ${data.length} old batch jobs`);
      return data.length;
    } catch (error) {
      logger.error('Failed to cleanup old batch jobs:', error);
      throw error;
    }
  }
}

module.exports = BatchJobService;