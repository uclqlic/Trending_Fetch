/**
 * HOTS热搜API JavaScript客户端
 * 用于在Web应用中调用热搜API
 */

class HotsAPIClient {
    constructor(baseUrl = 'http://localhost:8081') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 120000; // 2分钟缓存
    }

    /**
     * 获取热搜数据
     * @param {string} platform - 平台名称 (weibo, bili, douyin等)
     * @param {boolean} useCache - 是否使用缓存
     * @returns {Promise<Object>} 热搜数据
     */
    async getHotList(platform, useCache = true) {
        const cacheKey = `hot_${platform}`;

        // 检查缓存
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/hot/${platform}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 更新缓存
            if (data.code === 200 || data.code === 0) {
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    /**
     * 获取多个平台的热搜数据
     * @param {Array<string>} platforms - 平台名称数组
     * @returns {Promise<Object>} 所有平台的热搜数据
     */
    async getMultipleHotLists(platforms) {
        const promises = platforms.map(platform =>
            this.getHotList(platform).catch(error => ({
                platform,
                error: error.message
            }))
        );

        const results = await Promise.all(promises);

        return platforms.reduce((acc, platform, index) => {
            acc[platform] = results[index];
            return acc;
        }, {});
    }

    /**
     * 搜索热搜内容
     * @param {string} keyword - 搜索关键词
     * @param {Array<string>} platforms - 要搜索的平台
     * @returns {Promise<Array>} 搜索结果
     */
    async searchHotItems(keyword, platforms = ['weibo', 'bili', 'douyin']) {
        const allData = await this.getMultipleHotLists(platforms);
        const results = [];

        for (const [platform, response] of Object.entries(allData)) {
            if (response.error) continue;

            const items = response.data || [];
            const filtered = items.filter(item =>
                item.title && item.title.toLowerCase().includes(keyword.toLowerCase())
            );

            filtered.forEach(item => {
                results.push({
                    ...item,
                    platform: platform
                });
            });
        }

        return results;
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 获取支持的平台列表
     */
    getSupportedPlatforms() {
        return [
            { key: 'weibo', name: '微博' },
            { key: 'bili', name: 'B站' },
            { key: 'douyin', name: '抖音' },
            { key: 'zhihu/v2', name: '知乎' },
            { key: 'toutiao', name: '头条' },
            { key: 'xhs', name: '小红书' },
            { key: 'douban', name: '豆瓣' },
            { key: 'baidu', name: '百度' },
            { key: 'thepaper', name: '澎湃' },
            { key: 'wy163', name: '网易' },
            { key: 'qq', name: '腾讯' },
            { key: '36kr', name: '36氪' },
            { key: 'csdn', name: 'CSDN' },
            { key: 'juejin', name: '掘金' },
            { key: 'hellogithub', name: 'HelloGithub' },
            { key: 'ithome', name: 'IT之家' },
            { key: 'carhome', name: '汽车之家' },
            { key: 'dongchedi', name: '懂车帝' },
            { key: 'cheshi', name: '车市' }
        ];
    }
}

// 使用示例
/*
// 创建客户端实例
const hotsAPI = new HotsAPIClient('http://localhost:8081');

// 获取微博热搜
hotsAPI.getHotList('weibo').then(data => {
    console.log('微博热搜:', data);
    if (data.code === 200) {
        data.data.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} - ${item.hot_val}`);
        });
    }
});

// 获取多个平台热搜
hotsAPI.getMultipleHotLists(['weibo', 'bili', 'douyin']).then(data => {
    console.log('多平台热搜:', data);
});

// 搜索关键词
hotsAPI.searchHotItems('明星').then(results => {
    console.log('搜索结果:', results);
});
*/

// 如果是模块环境，导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotsAPIClient;
}