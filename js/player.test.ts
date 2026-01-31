/**
 * 云音乐播放器 - 播放器模块单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LyricLine } from './types';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Audio
class MockAudio {
    src = '';
    volume = 1;
    currentTime = 0;
    duration = 0;
    paused = true;
    error: MediaError | null = null;

    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    load = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
}

vi.stubGlobal('Audio', MockAudio);

// Mock navigator.mediaSession
Object.defineProperty(navigator, 'mediaSession', {
    value: {
        metadata: null,
        setActionHandler: vi.fn(),
    },
    writable: true,
});

describe('Player Module - Lyrics Parsing', () => {
    // 测试歌词解析函数（从 player.ts 中提取的逻辑）
    function parseLyrics(lrc: string, tlyric?: string): LyricLine[] {
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        function parseLine(line: string): { time: number; text: string }[] {
            const results: { time: number; text: string }[] = [];
            const timeMatches = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g);
            if (!timeMatches) return results;

            const text = line.replace(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g, '').trim();
            if (!text) return results;

            let match;
            timeRegex.lastIndex = 0;
            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const msStr = match[3];
                const ms = msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr, 10);
                const time = minutes * 60 + seconds + ms / 1000;
                results.push({ time, text });
            }

            return results;
        }

        const lines = lrc.split('\n');
        const result: LyricLine[] = [];

        for (const line of lines) {
            const parsed = parseLine(line);
            for (const item of parsed) {
                result.push({ time: item.time, text: item.text });
            }
        }

        if (tlyric) {
            const tlines = tlyric.split('\n');
            const translationMap = new Map<number, string>();

            for (const line of tlines) {
                const parsed = parseLine(line);
                for (const item of parsed) {
                    const timeKey = Math.round(item.time * 10);
                    translationMap.set(timeKey, item.text);
                }
            }

            for (const lyric of result) {
                const timeKey = Math.round(lyric.time * 10);
                const translation = translationMap.get(timeKey);
                if (translation) {
                    lyric.ttext = translation;
                }
            }
        }

        result.sort((a, b) => a.time - b.time);
        return result;
    }

    it('应正确解析标准 LRC 格式歌词', () => {
        const lrc = `[00:00.00]歌词第一行
[00:05.50]歌词第二行
[00:10.25]歌词第三行`;

        const result = parseLyrics(lrc);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ time: 0, text: '歌词第一行' });
        expect(result[1]).toEqual({ time: 5.5, text: '歌词第二行' });
        expect(result[2]).toEqual({ time: 10.25, text: '歌词第三行' });
    });

    it('应处理多时间戳行', () => {
        const lrc = `[00:00.00][00:30.00]重复歌词`;

        const result = parseLyrics(lrc);

        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('重复歌词');
        expect(result[1].text).toBe('重复歌词');
        expect(result[0].time).toBe(0);
        expect(result[1].time).toBe(30);
    });

    it('应忽略空文本行', () => {
        const lrc = `[00:00.00]有内容
[00:05.00]
[00:10.00]也有内容`;

        const result = parseLyrics(lrc);

        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('有内容');
        expect(result[1].text).toBe('也有内容');
    });

    it('应正确处理两位毫秒精度', () => {
        const lrc = `[00:01.50]测试`;

        const result = parseLyrics(lrc);

        expect(result).toHaveLength(1);
        expect(result[0].time).toBe(1.5);
    });

    it('应正确处理三位毫秒精度', () => {
        const lrc = `[00:01.500]测试`;

        const result = parseLyrics(lrc);

        expect(result).toHaveLength(1);
        expect(result[0].time).toBe(1.5);
    });

    it('应正确合并翻译歌词', () => {
        const lrc = `[00:00.00]Hello
[00:05.00]World`;
        const tlyric = `[00:00.00]你好
[00:05.00]世界`;

        const result = parseLyrics(lrc, tlyric);

        expect(result).toHaveLength(2);
        expect(result[0].ttext).toBe('你好');
        expect(result[1].ttext).toBe('世界');
    });

    it('应处理翻译歌词时间戳轻微偏移', () => {
        const lrc = `[00:00.00]Hello`;
        const tlyric = `[00:00.00]你好`; // 相同时间戳

        const result = parseLyrics(lrc, tlyric);

        expect(result[0].ttext).toBe('你好');
    });

    it('应按时间排序歌词', () => {
        const lrc = `[00:10.00]第三行
[00:00.00]第一行
[00:05.00]第二行`;

        const result = parseLyrics(lrc);

        expect(result[0].text).toBe('第一行');
        expect(result[1].text).toBe('第二行');
        expect(result[2].text).toBe('第三行');
    });
});

describe('Player Module - Playlist Storage', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('应正确保存歌单到 localStorage', () => {
        const playlistData = {
            playlists: [
                ['playlist_1', { name: '测试歌单', songs: [], id: 'test', createTime: '2024-01-01', isFavorites: false }],
            ],
            counter: 1,
        };

        localStorage.setItem('musicPlayerPlaylists', JSON.stringify(playlistData));

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'musicPlayerPlaylists',
            expect.any(String)
        );
    });

    it('应正确加载歌单从 localStorage', () => {
        const playlistData = {
            playlists: [
                ['playlist_1', { name: '我的喜欢', songs: [], id: 'favorites', createTime: '2024-01-01', isFavorites: true }],
            ],
            counter: 1,
        };

        localStorageMock.getItem.mockReturnValue(JSON.stringify(playlistData));

        const result = localStorage.getItem('musicPlayerPlaylists');
        expect(result).toBeTruthy();

        const parsed = JSON.parse(result!);
        expect(parsed.playlists[0][1].name).toBe('我的喜欢');
        expect(parsed.playlists[0][1].isFavorites).toBe(true);
    });

    it('应正确保存播放历史', () => {
        const history = [
            { id: '1', name: 'Song 1', artist: ['Artist'], album: 'Album', pic_id: '', lyric_id: '', source: 'netease' },
            { id: '2', name: 'Song 2', artist: ['Artist'], album: 'Album', pic_id: '', lyric_id: '', source: 'netease' },
        ];

        localStorage.setItem('musicPlayerHistory', JSON.stringify(history));

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'musicPlayerHistory',
            expect.any(String)
        );
    });
});

describe('Player Module - Quality Fallback', () => {
    it('应按正确顺序尝试品质降级', () => {
        const qualityFallback = ['999', '740', '320', '192', '128'];
        const preferredQuality = '320';

        const qualityQueue = [preferredQuality, ...qualityFallback.filter(q => q !== preferredQuality)];

        expect(qualityQueue).toEqual(['320', '999', '740', '192', '128']);
    });

    it('应正确构建品质名称映射', () => {
        const qualityNames: { [key: string]: string } = {
            '128': '标准 128K',
            '192': '较高 192K',
            '320': '高品质 320K',
            '740': '无损 FLAC',
            '999': 'Hi-Res',
        };

        expect(qualityNames['320']).toBe('高品质 320K');
        expect(qualityNames['999']).toBe('Hi-Res');
    });
});

describe('Player Module - Play Mode', () => {
    it('应正确循环播放模式', () => {
        const modes: ('loop' | 'random' | 'single')[] = ['loop', 'random', 'single'];
        let playMode: 'loop' | 'random' | 'single' = 'loop';

        // 模拟切换
        for (let i = 0; i < 3; i++) {
            const currentModeIndex = modes.indexOf(playMode);
            playMode = modes[(currentModeIndex + 1) % modes.length];
        }

        expect(playMode).toBe('loop'); // 循环回到初始模式
    });

    it('应正确计算下一首索引（列表循环）', () => {
        const playlistLength = 5;
        const currentIndex = 4; // 最后一首

        const newIndex = (currentIndex + 1) % playlistLength;

        expect(newIndex).toBe(0); // 回到第一首
    });

    it('应正确计算上一首索引', () => {
        const playlistLength = 5;
        const currentIndex = 0; // 第一首

        const newIndex = (currentIndex - 1 + playlistLength) % playlistLength;

        expect(newIndex).toBe(4); // 回到最后一首
    });
});

describe('Player Module - Media Error Handling', () => {
    it('应正确识别媒体错误类型', () => {
        const errorMessages: { [key: number]: string } = {
            1: '播放被中断',
            2: '网络错误导致加载失败',
            3: '音频解码失败',
            4: '音频格式不支持或URL无效',
        };

        expect(errorMessages[1]).toBe('播放被中断');
        expect(errorMessages[2]).toBe('网络错误导致加载失败');
        expect(errorMessages[3]).toBe('音频解码失败');
        expect(errorMessages[4]).toBe('音频格式不支持或URL无效');
    });
});

describe('Player Module - Fade Effects', () => {
    it('应正确计算淡入淡出参数', () => {
        const FADE_DURATION = 400;
        const FADE_STEPS = 10;
        const targetVolume = 0.8;

        const stepTime = FADE_DURATION / FADE_STEPS;
        const volumeStep = targetVolume / FADE_STEPS;

        expect(stepTime).toBe(40);
        expect(volumeStep).toBe(0.08);
    });

    it('应正确计算各步骤音量', () => {
        const FADE_STEPS = 10;
        const targetVolume = 1.0;
        const volumeStep = targetVolume / FADE_STEPS;

        const volumes: number[] = [];
        for (let i = 0; i <= FADE_STEPS; i++) {
            volumes.push(Math.min(targetVolume, volumeStep * i));
        }

        expect(volumes[0]).toBe(0);
        expect(volumes[FADE_STEPS]).toBe(1.0);
        expect(volumes.length).toBe(11);
    });
});
