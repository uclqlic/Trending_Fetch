// 测试各平台API返回内容
const platforms = [
    'baidu',
    'toutiao',
    'douban',
    'xhs',
    '36kr',
    'juejin',
    'ithome'
];

async function testAllAPIs() {
    for (const platform of platforms) {
        const url = `http://localhost:8081/api/hot/${platform}`;
        console.log(`\n=== Testing ${platform} ===`);
        console.log(`URL: ${url}`);

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 0 && data.data && data.data.length > 0) {
                console.log(`✅ Success - First 3 items:`);
                data.data.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i+1}. ${item.title}`);
                    if (item.hot_val) console.log(`     热度: ${item.hot_val}`);
                });
            } else {
                console.log(`❌ No data returned`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

// 测试单个平台并显示完整响应
async function testSinglePlatform(platform) {
    const url = `http://localhost:8081/api/hot/${platform}`;
    console.log(`\nTesting ${platform}: ${url}`);

    try {
        const response = await fetch(url);
        const text = await response.text();
        console.log('Raw response (first 500 chars):');
        console.log(text.substring(0, 500));

        const data = JSON.parse(text);
        console.log(`\nParsed - Code: ${data.code}, Has data: ${!!data.data}`);
        if (data.data && data.data[0]) {
            console.log('First item:', data.data[0]);
        }
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

// 运行测试
console.log('Starting API tests...\n');
testAllAPIs().then(() => {
    console.log('\n\n=== Detailed test for potential problem platforms ===');
    return Promise.all([
        testSinglePlatform('douban'),
        testSinglePlatform('toutiao'),
        testSinglePlatform('36kr'),
        testSinglePlatform('juejin'),
        testSinglePlatform('ithome')
    ]);
});