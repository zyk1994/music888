/**
 * 云音乐播放器 - API 模块
 * 负责与外部音乐 API 通信，包括搜索、获取歌曲信息、歌词等
 */

/**
 * 歌曲数据结构
 */
export interface Song {
    /** 歌曲 ID */
    id: string;
    /** 歌曲名称 */
    name: string;
    /** 歌手列表 */
    artist: string[];
    /** 专辑名称 */
    album: string;
    /** 封面图片 ID 或 URL */
    pic_id: string;
    /** 歌词 ID */
    lyric_id: string;
    /** 音乐源标识 */
    source: string;
    /** 封面 URL（用于 NEC API） */
    pic_url?: string;
}

/**
 * API 源配置
 * NOTE: NEC API 支持搜索，Meting API 只支持歌单/歌曲详情/歌词等
 */
interface ApiSource {
    name: string;
    url: string;
    type: 'nec' | 'meting';
    /** 是否支持搜索功能 */
    supportsSearch: boolean;
}

// NOTE: API 源配置 - 按功能和稳定性排列
// IMPORTANT: 只有 NEC API 支持搜索功能，Meting API 已移除搜索支持
const API_SOURCES: ApiSource[] = [
    {
        name: 'NEC API',
        url: 'https://nec8.de5.net',
        type: 'nec',
        supportsSearch: true
    },
    {
        name: 'Meting API 1',
        url: 'https://api.injahow.cn/meting',
        type: 'meting',
        supportsSearch: false
    },
    {
        name: 'Meting API 2',
        url: 'https://meting.qjqq.cn',
        type: 'meting',
        supportsSearch: false
    }
];

let currentAPI = API_SOURCES[0];

// NOTE: 代理端点路径，用于解决 CORS 问题
const PROXY_ENDPOINT = '/api/proxy';

/**
 * 检测是否需要使用代理
 * 开发环境使用 Vite 代理，生产环境使用 Vercel Serverless Function
 */
function shouldUseProxy(): boolean {
    // 本地开发环境（localhost）可能已配置 Vite 代理，但为保险起见统一使用代理
    return true;
}

/**
 * 将外部 URL 转换为代理 URL
 * @param url 原始外部 API URL
 * @returns 代理后的 URL
 */
function toProxyUrl(url: string): string {
    if (!shouldUseProxy()) {
        return url;
    }
    // 编码 URL 作为查询参数传递给代理
    return `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`;
}

/**
 * 测试 API 可用性（通过代理）
 * NOTE: 根据 API 类型使用不同的测试端点
 * - NEC API: 使用搜索接口测试
 * - Meting API: 使用歌单接口测试（新版不支持搜索）
 */
async function testAPI(api: ApiSource): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let testUrl: string;
        if (api.type === 'nec') {
            // NEC API 支持搜索
            testUrl = `${api.url}/search?keywords=test&limit=1`;
        } else {
            // Meting API 新版格式：/?type=playlist&id=xxx
            // 使用一个公开的测试歌单 ID
            testUrl = `${api.url}/?type=playlist&id=60198`;
        }

        // NOTE: 通过代理测试 API，避免 CORS 问题
        const proxyUrl = toProxyUrl(testUrl);
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log(`  API 返回状态码: ${response.status}`);
            return false;
        }

        // NOTE: 验证响应内容类型，确保不是 HTML 页面
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            console.log(`  API 返回 HTML 而非 JSON`);
            return false;
        }

        // 尝试解析 JSON，确保数据有效
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            // 对于 NEC API，检查是否有有效的 code 字段
            if (api.type === 'nec') {
                return data.code === 200;
            }
            // 对于 Meting API，检查是否是数组（歌单歌曲列表）
            if (Array.isArray(data) && data.length > 0) {
                return true;
            }
            // 检查是否有错误
            if (data.error) {
                console.log(`  Meting API 返回错误: ${data.error}`);
                return false;
            }
            return typeof data === 'object' && data !== null;
        } catch {
            console.log(`  API 响应不是有效 JSON: ${text.substring(0, 100)}`);
            return false;
        }
    } catch (error) {
        console.log(`  API 测试失败: ${error}`);
        return false;
    }
}

/**
 * 查找可用的 API
 */
export async function findWorkingAPI(): Promise<{ success: boolean; name?: string }> {
    console.log('正在检测可用的 API...');
    for (const api of API_SOURCES) {
        console.log(`测试 ${api.name}...`);
        const isWorking = await testAPI(api);
        if (isWorking) {
            currentAPI = api;
            console.log(`✅ ${api.name} 可用`);
            return { success: true, name: api.name };
        } else {
            console.log(`❌ ${api.name} 不可用`);
        }
    }
    console.error('所有 API 均不可用');
    return { success: false };
}

/**
 * 带重试的 fetch 请求（自动通过代理）
 * @param url 原始外部 API URL
 * @param options fetch 选项
 * @param retries 重试次数
 * @param useProxy 是否使用代理（默认 true）
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = 2,
    useProxy: boolean = true
): Promise<Response> {
    // NOTE: 将外部 URL 转换为代理 URL 以解决 CORS 问题
    const requestUrl = useProxy ? toProxyUrl(url) : url;

    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const response = await fetch(requestUrl, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                // NOTE: 检查响应内容类型，确保是 JSON 而非 HTML 错误页面
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                    // 可能是错误页面，尝试读取内容进行诊断
                    const text = await response.text();
                    console.error('API 返回 HTML 而非 JSON:', text.substring(0, 200));
                    throw new Error('API returned HTML instead of JSON, possible error page');
                }
                return response;
            } else {
                throw new Error(`API returned error: ${response.status}`);
            }
        } catch (error) {
            console.error(`Request failed (attempt ${i + 1}/${retries + 1}):`, error);
            if (i === retries) throw error;
        }
    }
    throw new Error('All fetch attempts failed.');
}

/**
 * 获取专辑封面 URL
 */
export async function getAlbumCoverUrl(song: Song, size: number = 300): Promise<string> {
    // 如果已有封面 URL，直接返回（带参数调整大小）
    if (song.pic_url) {
        // 网易云 CDN 图片直接拼接参数
        if (song.pic_url.includes('music.126.net')) {
            return song.pic_url + `?param=${size}y${size}`;
        }
        return song.pic_url;
    }

    if (!song.pic_id) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }

    try {
        if (currentAPI.type === 'nec') {
            // NOTE: NEC API 不直接返回封面 URL，需要从专辑详情获取
            // 直接构造网易云 CDN 图片 URL（图片一般没有 CORS 问题）
            return `https://p1.music.126.net/${song.pic_id}/${song.pic_id}.jpg?param=${size}y${size}`;
        } else {
            // Meting API 新格式: /?type=pic&id=xxx
            const response = await fetchWithRetry(`${currentAPI.url}/?type=pic&id=${song.pic_id}`);
            const data = await response.json();
            console.log('封面 API 响应:', data);
            return data?.url || data?.pic || '';
        }
    } catch (error) {
        console.error('获取专辑图失败:', error);
        return '';
    }
}

/**
 * 获取歌曲播放 URL
 */
export async function getSongUrl(song: Song, quality: string): Promise<{ url: string; br: string }> {
    if (currentAPI.type === 'nec') {
        // NEC API: /song/url/v1
        const level = quality === '999' ? 'hires' : quality === '740' ? 'lossless' : quality === '320' ? 'exhigh' : 'standard';
        const response = await fetchWithRetry(`${currentAPI.url}/song/url/v1?id=${song.id}&level=${level}`);
        const data = await response.json();
        if (data.code === 200 && data.data?.[0]) {
            const result = { url: data.data[0].url || '', br: String(data.data[0].br || quality) };
            console.log('获取音频 URL:', result.url ? result.url.substring(0, 80) + '...' : '(空)');
            return result;
        }
        console.warn('NEC API 返回空 URL, data:', data);
        return { url: '', br: quality };
    } else {
        // Meting API 新格式: /?type=url&id=xxx
        const response = await fetchWithRetry(`${currentAPI.url}/?type=url&id=${song.id}`);
        const result = await response.json();
        console.log('获取音频 URL:', result?.url ? result.url.substring(0, 80) + '...' : '(空)', 'response:', result);
        return { url: result?.url || '', br: quality };
    }
}

/**
 * 获取歌词
 */
export async function getLyrics(song: Song): Promise<{ lyric: string }> {
    if (currentAPI.type === 'nec') {
        // NEC API: /lyric
        const response = await fetchWithRetry(`${currentAPI.url}/lyric?id=${song.id}`);
        const data = await response.json();
        if (data.code === 200) {
            return { lyric: data.lrc?.lyric || '' };
        }
        return { lyric: '' };
    } else {
        // Meting API 新格式: /?type=lrc&id=xxx
        const response = await fetchWithRetry(`${currentAPI.url}/?type=lrc&id=${song.lyric_id || song.id}`);
        const result = await response.json();
        return { lyric: result?.lyric || '' };
    }
}

/**
 * 搜索音乐
 * NOTE: 只有 NEC API 支持搜索，Meting API 已移除搜索功能
 * @param keyword 搜索关键词
 * @param _source 音乐源（保留参数，目前只支持网易云）
 */
export async function searchMusicAPI(keyword: string, _source?: string): Promise<Song[]> {
    // NOTE: Meting API 不支持搜索，始终使用 NEC API 进行搜索
    // NEC API 目前只支持网易云音乐，_source 参数暂时保留以保持 API 兼容性
    const searchApiUrl = 'https://nec8.de5.net';

    try {
        const response = await fetchWithRetry(`${searchApiUrl}/search?keywords=${encodeURIComponent(keyword)}&limit=30`);
        const data = await response.json();

        if (data.code === 200 && data.result?.songs) {
            return data.result.songs.map((song: any) => ({
                id: String(song.id),
                name: song.name,
                artist: song.artists?.map((a: any) => a.name) || [],
                album: song.album?.name || '',
                pic_id: String(song.album?.id || ''),
                pic_url: song.album?.picUrl || '',
                lyric_id: String(song.id),
                source: 'netease'
            }));
        }
        return [];
    } catch (error) {
        console.error('搜索失败:', error);
        return [];
    }
}

/**
 * 探索雷达 - 获取热门推荐歌曲
 * NOTE: 包含多层回退机制，确保用户能看到内容
 */
export async function exploreRadarAPI(): Promise<Song[]> {
    const keywords = ['周杰伦', '林俊杰', '邓紫棋', '薛之谦', '陈奕迅', '五月天', '华晨宇', 'TFBOYS'];

    // 打乱关键词数组，增加随机性
    const shuffled = keywords.sort(() => Math.random() - 0.5);

    // 依次尝试不同关键词，直到成功获取数据
    for (const keyword of shuffled.slice(0, 3)) {
        try {
            const songs = await searchMusicAPI(keyword, 'netease');
            if (songs && songs.length > 0) {
                console.log(`探索雷达成功获取 ${songs.length} 首歌曲 (关键词: ${keyword})`);
                return songs;
            }
        } catch (error) {
            console.warn(`探索雷达请求失败 (关键词: ${keyword}):`, error);
            // 继续尝试下一个关键词
        }
    }

    console.error('探索雷达: 所有关键词尝试均失败');
    return [];
}

/**
 * 解析歌单
 */
export async function parsePlaylistAPI(playlistUrlOrId: string): Promise<{ songs: Song[]; name?: string; count?: number }> {
    let playlistId = playlistUrlOrId.trim();

    console.log('开始解析歌单:', playlistUrlOrId);

    // 支持多种URL格式
    if (playlistId.includes('music.163.com') || playlistId.includes('163cn.tv')) {
        const patterns = [/id=(\d+)/, /playlist\/(\d+)/, /\/(\d+)\?/, /\/(\d+)$/];
        let matched = false;
        for (const pattern of patterns) {
            const idMatch = playlistId.match(pattern);
            if (idMatch?.[1]) {
                playlistId = idMatch[1];
                matched = true;
                break;
            }
        }
        if (!matched) throw new Error('无法从URL中提取歌单ID');
    } else if (!/^\d+$/.test(playlistId)) {
        throw new Error('歌单ID格式无效');
    }

    if (currentAPI.type === 'nec') {
        // NEC API: /playlist/detail
        const response = await fetchWithRetry(`${currentAPI.url}/playlist/detail?id=${playlistId}`);
        const data = await response.json();

        if (data.code === 200 && data.playlist) {
            const trackIds = data.playlist.trackIds?.map((t: any) => t.id).slice(0, 100) || [];

            // 获取歌曲详情
            const detailResponse = await fetchWithRetry(`${currentAPI.url}/song/detail?ids=${trackIds.join(',')}`);
            const detailData = await detailResponse.json();

            if (detailData.code === 200 && detailData.songs) {
                const songs = detailData.songs.map((song: any) => ({
                    id: String(song.id),
                    name: song.name,
                    artist: song.ar?.map((a: any) => a.name) || [],
                    album: song.al?.name || '',
                    pic_id: String(song.al?.id || ''),
                    pic_url: song.al?.picUrl || '',
                    lyric_id: String(song.id),
                    source: 'netease'
                }));

                return {
                    songs,
                    name: data.playlist.name,
                    count: songs.length
                };
            }
        }
        throw new Error('歌单解析失败');
    } else {
        // Meting API 新格式: /?type=playlist&id=xxx
        const response = await fetchWithRetry(`${currentAPI.url}/?type=playlist&id=${playlistId}`);
        const playlistData = await response.json();

        if (!playlistData) throw new Error('API返回空数据');
        if (playlistData.error || playlistData.msg) throw new Error(playlistData.error || playlistData.msg);

        let songs: Song[] = [];
        let playlistName = '未命名歌单';

        if (Array.isArray(playlistData)) {
            songs = playlistData;
        } else if (playlistData.songs) {
            songs = playlistData.songs;
            playlistName = playlistData.name || playlistName;
        }

        songs = songs.map((song: any) => ({ ...song, source: 'netease' }));

        return { songs, name: playlistName, count: songs.length };
    }
}
