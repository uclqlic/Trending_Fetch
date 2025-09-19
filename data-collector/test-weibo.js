// 测试微博GitHub数据采集
const axios = require('axios');

async function testWeiboGithubFetch() {
  console.log('开始测试微博数据采集...\n');

  try {
    // 1. 测试GitHub README获取
    console.log('1. 正在从GitHub获取README...');
    const response = await axios.get('https://raw.githubusercontent.com/justjavac/weibo-trending-hot-search/master/README.md', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/plain, text/markdown, */*'
      }
    });

    if (!response.data) {
      console.log('❌ 获取README失败：返回空数据');
      return;
    }

    console.log('✅ 成功获取README\n');

    // 2. 解析热搜数据
    console.log('2. 解析热搜数据...');
    const content = response.data;
    const beginMatch = content.indexOf('<!-- BEGIN -->');
    const endMatch = content.indexOf('<!-- END -->', beginMatch);

    if (beginMatch === -1 || endMatch === -1) {
      console.log('❌ 未找到BEGIN/END标记');
      return;
    }

    const hotSearchSection = content.substring(beginMatch, endMatch);

    // 提取热搜项
    const regex = /^\d+\.\s*\[([^\]]+)\]\(([^)]+)\)/gm;
    const items = [];
    let match;

    while ((match = regex.exec(hotSearchSection)) !== null) {
      items.push({
        rank: items.length + 1,
        title: match[1],
        url: match[2]
      });
    }

    console.log(`✅ 成功解析 ${items.length} 条热搜\n`);

    // 3. 显示前5条数据
    console.log('3. 前5条热搜数据：');
    console.log('================================');
    items.slice(0, 5).forEach(item => {
      console.log(`#${item.rank} ${item.title}`);
      console.log(`   链接: ${item.url.substring(0, 50)}...`);
      console.log('');
    });

    // 4. 测试数据结构转换
    console.log('4. 测试数据格式转换...');
    const sampleItem = items[0];
    if (sampleItem) {
      const formatted = {
        rank: sampleItem.rank,
        title: sampleItem.title,
        url: sampleItem.url.startsWith('http') ? sampleItem.url : `https://s.weibo.com${sampleItem.url}`,
        hot_value: (51 - sampleItem.rank) * 100000,
        category: '热搜',
        content_hash: require('crypto').createHash('md5').update(`weibo:${sampleItem.title}${sampleItem.url}`).digest('hex')
      };

      console.log('转换后的数据样例:');
      console.log(JSON.stringify(formatted, null, 2));
    }

    console.log('\n✅ 测试完成！微博数据采集功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data?.substring(0, 200));
    }
  }
}

// 运行测试
testWeiboGithubFetch();