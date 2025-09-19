/**
 * React组件示例 - 热搜聚合展示组件
 * 可以直接集成到您的React项目中
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 热搜展示组件
const HotSearchComponent = ({ apiUrl = 'http://localhost:8081' }) => {
    const [platform, setPlatform] = useState('weibo');
    const [hotList, setHotList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const platforms = [
        { key: 'weibo', name: '微博', icon: '🔥' },
        { key: 'bili', name: 'B站', icon: '📺' },
        { key: 'douyin', name: '抖音', icon: '🎵' },
        { key: 'zhihu/v2', name: '知乎', icon: '💡' },
        { key: 'toutiao', name: '头条', icon: '📰' },
        { key: 'xhs', name: '小红书', icon: '📖' },
        { key: 'douban', name: '豆瓣', icon: '🎬' },
        { key: 'baidu', name: '百度', icon: '🔍' },
        { key: '36kr', name: '36氪', icon: '💼' },
        { key: 'csdn', name: 'CSDN', icon: '👨‍💻' },
        { key: 'juejin', name: '掘金', icon: '⛏️' },
        { key: 'ithome', name: 'IT之家', icon: '🖥️' }
    ];

    // 获取热搜数据
    const fetchHotData = async (platformKey) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${apiUrl}/api/hot/${platformKey}`);

            if (response.data.code === 200 || response.data.code === 0) {
                setHotList(response.data.data || []);
                setLastUpdate(new Date());
            } else {
                setError('获取数据失败');
            }
        } catch (err) {
            console.error('API调用失败:', err);
            setError(err.message || '网络错误');
        } finally {
            setLoading(false);
        }
    };

    // 切换平台时重新获取数据
    useEffect(() => {
        fetchHotData(platform);
    }, [platform]);

    // 自动刷新（每2分钟）
    useEffect(() => {
        const interval = setInterval(() => {
            fetchHotData(platform);
        }, 120000);

        return () => clearInterval(interval);
    }, [platform]);

    // 格式化热度值
    const formatHotValue = (value) => {
        if (!value) return '';
        const num = parseInt(value);
        if (isNaN(num)) return value;

        if (num > 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num > 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return value;
    };

    // 获取排名样式
    const getRankStyle = (index) => {
        if (index === 0) return { backgroundColor: '#FFD700', color: '#333' };
        if (index === 1) return { backgroundColor: '#C0C0C0', color: '#333' };
        if (index === 2) return { backgroundColor: '#CD7F32', color: '#FFF' };
        return { backgroundColor: '#F0F0F0', color: '#666' };
    };

    return (
        <div style={styles.container}>
            {/* 平台选择器 */}
            <div style={styles.platformSelector}>
                {platforms.map(p => (
                    <button
                        key={p.key}
                        style={{
                            ...styles.platformBtn,
                            ...(platform === p.key ? styles.platformBtnActive : {})
                        }}
                        onClick={() => setPlatform(p.key)}
                    >
                        {p.icon} {p.name}
                    </button>
                ))}
            </div>

            {/* 更新时间 */}
            {lastUpdate && (
                <div style={styles.updateTime}>
                    最后更新: {lastUpdate.toLocaleTimeString()}
                </div>
            )}

            {/* 热搜列表 */}
            <div style={styles.hotList}>
                {loading && <div style={styles.loading}>加载中...</div>}
                {error && <div style={styles.error}>错误: {error}</div>}

                {!loading && !error && hotList.map((item, index) => (
                    <div key={index} style={styles.hotItem}>
                        <div style={{...styles.rank, ...getRankStyle(index)}}>
                            {item.pos || index + 1}
                        </div>
                        <div style={styles.content}>
                            <div style={styles.title}>
                                {item.title}
                                {item.label && (
                                    <span style={styles.label}>{item.label}</span>
                                )}
                            </div>
                            {item.desc && (
                                <div style={styles.desc}>{item.desc}</div>
                            )}
                            {item.hot_val && (
                                <div style={styles.hotValue}>
                                    🔥 {formatHotValue(item.hot_val)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 刷新按钮 */}
            <button
                style={styles.refreshBtn}
                onClick={() => fetchHotData(platform)}
                disabled={loading}
            >
                🔄
            </button>
        </div>
    );
};

// 样式定义
const styles = {
    container: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
    },
    platformSelector: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '20px',
    },
    platformBtn: {
        padding: '8px 16px',
        border: '1px solid #ddd',
        borderRadius: '20px',
        background: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.3s',
    },
    platformBtnActive: {
        background: '#1890ff',
        color: 'white',
        borderColor: '#1890ff',
    },
    updateTime: {
        fontSize: '12px',
        color: '#999',
        marginBottom: '10px',
    },
    hotList: {
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    hotItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.3s',
    },
    rank: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        marginRight: '15px',
        flexShrink: 0,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: '15px',
        color: '#333',
        marginBottom: '4px',
    },
    label: {
        marginLeft: '8px',
        padding: '2px 6px',
        background: '#ff6b6b',
        color: 'white',
        fontSize: '12px',
        borderRadius: '3px',
    },
    desc: {
        fontSize: '13px',
        color: '#666',
        marginBottom: '4px',
    },
    hotValue: {
        fontSize: '12px',
        color: '#ff6b6b',
    },
    loading: {
        padding: '40px',
        textAlign: 'center',
        color: '#999',
    },
    error: {
        padding: '20px',
        textAlign: 'center',
        color: '#ff4d4f',
    },
    refreshBtn: {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'white',
        border: '1px solid #ddd',
        fontSize: '20px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s',
    },
};

export default HotSearchComponent;

// 使用示例:
// import HotSearchComponent from './HotSearchComponent';
//
// function App() {
//     return (
//         <div>
//             <h1>热搜聚合</h1>
//             <HotSearchComponent apiUrl="http://localhost:8081" />
//         </div>
//     );
// }