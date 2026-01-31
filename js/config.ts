/**
 * 云音乐播放器 - 配置模块
 * 集中管理 API 配置、超时时间、代理域名白名单等
 */

// ============================================
// 日志级别配置
// ============================================

/**
 * 判断是否为生产环境
 * NOTE: Vite 会在构建时替换 import.meta.env.PROD
 */
export const IS_PRODUCTION = import.meta.env.PROD;

/**
 * 日志工具 - 生产环境禁用详细日志
 */
export const logger = {
    /**
     * 调试日志 - 仅开发环境输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...args: any[]): void => {
        if (!IS_PRODUCTION) {
            console.log(...args);
        }
    },

    /**
     * 信息日志 - 仅开发环境输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...args: any[]): void => {
        if (!IS_PRODUCTION) {
            console.log(...args);
        }
    },

    /**
     * 警告日志 - 始终输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]): void => {
        console.warn(...args);
    },

    /**
     * 错误日志 - 始终输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]): void => {
        console.error(...args);
    }
};

// ============================================
// API 超时配置 (单位: 毫秒)
// ============================================

export const API_TIMEOUTS = {
    /** API 可用性检测超时 */
    API_DETECTION: 8000,

    /** 搜索请求超时 */
    SEARCH: 20000,

    /** 获取歌曲 URL 超时 */
    SONG_URL: 15000,

    /** 获取歌词超时 */
    LYRICS: 10000,

    /** 解析歌单超时 */
    PLAYLIST: 30000,
};

// ============================================
// 代理域名白名单
// NOTE: 需要通过代理访问的音频 CDN 域名
// ============================================

export const PROXY_DOMAINS = [
    // 网易云音乐 CDN
    'music.126.net',
    'm7.music.126.net',
    'm8.music.126.net',
    'm701.music.126.net',
    'm801.music.126.net',
    // QQ 音乐 CDN
    'stream.qqmusic.qq.com',
    'dl.stream.qqmusic.qq.com',
    'ws.stream.qqmusic.qq.com',
    'isure.stream.qqmusic.qq.com',
    // 酷狗音乐 CDN
    'kugou.com',
    'trackercdn.kugou.com',
    'webfs.tx.kugou.com',
    // 咪咕音乐 CDN
    'migu.cn',
    'freetyst.nf.migu.cn',
    // 酷我音乐 CDN
    'kuwo.cn',
    'sycdn.kuwo.cn',
    // JOOX CDN
    'joox.com',
    // 喜马拉雅 CDN
    'xmcdn.com',
    'ximalaya.com',
];

/**
 * 检查 URL 是否需要通过代理访问
 * @param url 音频 URL
 * @returns 是否需要代理
 */
export function needsProxy(url: string): boolean {
    return PROXY_DOMAINS.some(domain => url.includes(domain));
}

// ============================================
// 其他常量配置
// ============================================

export const APP_CONFIG = {
    /** 播放历史最大存储数量 */
    MAX_HISTORY_SIZE: 50,

    /** 无限滚动每批加载数量 */
    INFINITE_SCROLL_BATCH_SIZE: 30,

    /** 默认音质 */
    DEFAULT_QUALITY: '320',

    /** GDStudio API 缓存时间 (毫秒) */
    GDSTUDIO_CACHE_TTL: 5 * 60 * 1000,

    /** 音频淡入淡出持续时间 (毫秒) */
    FADE_DURATION: 400,

    /** 音频淡入淡出步数 */
    FADE_STEPS: 10,
};
