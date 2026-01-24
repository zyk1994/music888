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
 */
interface ApiSource {
    name: string;
    url: string;
    type: 'nec' | 'meting'; // nec = NeteaseCloudMusicApi Enhanced, meting = Meting API
}

// NOTE: API 源配置 - 支持两种接口格式
const API_SOURCES: ApiSource[] = [
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php',
        type: 'meting'
    },
    {
        name: '备用 API (NEC Enhanced)',
        url: 'https://nec8.de5.net',
        type: 'nec'
    }
];

let currentAPI = API_SOURCES[0];

/**
 * 测试 API 可用性
 */
async function testAPI(api: ApiSource): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        let testUrl: string;
        if (api.type === 'nec') {
            testUrl = `${api.url}/search?keywords=test&limit=1`;
        } else {
            testUrl = `${api.url}?types=search&source=netease&name=test&count=1`;
        }

        const response = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
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
 * 带重试的 fetch 请求
 */
export async function fetchWithRetry(url: string, options: RequestInit = {}, retries: number = 2): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
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
    // 如果已有封面 URL，直接返回
    if (song.pic_url) {
        return song.pic_url + `?param=${size}y${size}`;
    }

    if (!song.pic_id) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }

    try {
        if (currentAPI.type === 'nec') {
            // NEC API: 直接使用网易云 CDN
            return `https://p1.music.126.net/${song.pic_id}/${song.pic_id}.jpg?param=${size}y${size}`;
        } else {
            // Meting API
            const response = await fetchWithRetry(`${currentAPI.url}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`);
            const data = await response.json();
            return data?.url || '';
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
            return { url: data.data[0].url || '', br: String(data.data[0].br || quality) };
        }
        return { url: '', br: quality };
    } else {
        // Meting API
        const response = await fetchWithRetry(`${currentAPI.url}?types=url&source=${song.source}&id=${song.id}&br=${quality}`);
        return await response.json();
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
        // Meting API
        const response = await fetchWithRetry(`${currentAPI.url}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`);
        return await response.json();
    }
}

/**
 * 搜索音乐
 */
export async function searchMusicAPI(keyword: string, source: string): Promise<Song[]> {
    if (currentAPI.type === 'nec') {
        // NOTE: NEC API 目前只支持网易云音乐
        const response = await fetchWithRetry(`${currentAPI.url}/search?keywords=${encodeURIComponent(keyword)}&limit=30`);
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
    } else {
        // Meting API
        const response = await fetchWithRetry(`${currentAPI.url}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=30`);
        const data = await response.json();
        return data.map((song: any) => ({ ...song, source: source }));
    }
}

/**
 * 探索雷达 - 获取热门推荐歌曲
 */
export async function exploreRadarAPI(): Promise<Song[]> {
    const keywords = ['周杰伦', '林俊杰', '邓紫棋', '薛之谦', '陈奕迅', '五月天'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

    try {
        return await searchMusicAPI(randomKeyword, 'netease');
    } catch (error) {
        console.error('探索雷达请求失败:', error);
        return [];
    }
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
        // Meting API
        const response = await fetchWithRetry(`${currentAPI.url}?types=playlist&source=netease&id=${playlistId}`);
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
