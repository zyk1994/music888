/**
 * 云音乐播放器 - API 模块单元测试
 */
import { MusicError, MusicErrorType, Song, LyricLine, LyricResult } from './types';

// 测试 MusicError 类型
describe('MusicError', () => {
    it('应正确创建网络错误', () => {
        const error = new MusicError(
            MusicErrorType.NETWORK,
            'Connection failed',
            '网络连接失败'
        );

        expect(error.type).toBe(MusicErrorType.NETWORK);
        expect(error.message).toBe('Connection failed');
        expect(error.userMessage).toBe('网络连接失败');
        expect(error.name).toBe('MusicError');
    });

    it('应正确创建 API 错误', () => {
        const error = new MusicError(
            MusicErrorType.API,
            'API returned 500',
            '服务器错误'
        );

        expect(error.type).toBe(MusicErrorType.API);
        expect(error.userMessage).toBe('服务器错误');
    });

    it('应正确保存原始错误', () => {
        const originalError = new Error('Original error');
        const error = new MusicError(
            MusicErrorType.UNKNOWN,
            'Wrapped error',
            '未知错误',
            originalError
        );

        expect(error.cause).toBe(originalError);
    });

    it('应正确创建播放错误', () => {
        const error = new MusicError(
            MusicErrorType.PLAYBACK,
            'Playback failed',
            '播放失败'
        );

        expect(error.type).toBe(MusicErrorType.PLAYBACK);
    });

    it('应正确创建解析错误', () => {
        const error = new MusicError(
            MusicErrorType.PARSE,
            'Parse failed',
            '解析失败'
        );

        expect(error.type).toBe(MusicErrorType.PARSE);
    });
});

describe('MusicErrorType', () => {
    it('应包含所有错误类型', () => {
        expect(MusicErrorType.NETWORK).toBe('NETWORK');
        expect(MusicErrorType.API).toBe('API');
        expect(MusicErrorType.PLAYBACK).toBe('PLAYBACK');
        expect(MusicErrorType.PARSE).toBe('PARSE');
        expect(MusicErrorType.UNKNOWN).toBe('UNKNOWN');
    });
});

// 歌词解析工具函数测试（这些是纯函数，可以在测试中使用）
describe('Lyric Parsing Utilities', () => {
    // 模拟 player.ts 中的 parseLyrics 函数进行测试
    function parseLyrics(lrc: string): LyricLine[] {
        if (!lrc) return [];

        const lines = lrc.split('\n');
        const result: LyricLine[] = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const milliseconds = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
                const time = minutes * 60 + seconds + milliseconds / 1000;
                const text = line.replace(timeRegex, '').trim();
                if (text) {
                    result.push({ time, text });
                }
            }
        }

        return result.sort((a, b) => a.time - b.time);
    }

    function parseLyricsFromResponse(lrc: string, tlyric?: string): LyricLine[] {
        const mainLyrics = parseLyrics(lrc);
        if (!tlyric) return mainLyrics;

        const translationLyrics = parseLyrics(tlyric);
        const translationMap = new Map(translationLyrics.map(l => [Math.floor(l.time), l.text]));

        return mainLyrics.map(line => {
            const timeKey = Math.floor(line.time);
            return {
                ...line,
                ttext: translationMap.get(timeKey) || translationMap.get(timeKey - 1) || translationMap.get(timeKey + 1)
            };
        });
    }

    it('应正确解析普通歌词', () => {
        const lyric = `[00:00.00]第一行
[00:05.50]第二行
[00:10.25]第三行`;

        const result = parseLyrics(lyric);

        expect(result.length).toBe(3);
        expect(result[0]).toEqual({ time: 0, text: '第一行' });
        expect(result[1]).toEqual({ time: 5.5, text: '第二行' });
        expect(result[2]).toEqual({ time: 10.25, text: '第三行' });
    });

    it('应处理空歌词', () => {
        expect(parseLyrics('')).toEqual([]);
        expect(parseLyrics(null as unknown as string)).toEqual([]);
    });

    it('应处理没有时间戳的行', () => {
        const lyric = `第一行
[00:05.00]第二行
没有时间`;

        const result = parseLyrics(lyric);

        expect(result.length).toBe(1);
        expect(result[0]).toEqual({ time: 5, text: '第二行' });
    });

    it('应处理毫秒精度的时间戳', () => {
        const lyric = `[00:00.000]精确时间
[00:01.999]另一行`;

        const result = parseLyrics(lyric);

        expect(result.length).toBe(2);
        expect(result[0].time).toBe(0);
        expect(result[1].time).toBe(1.999);
    });

    it('应正确处理中文歌词', () => {
        const lyric = `[00:00.00]这是第一行歌词
[00:05.50]这是第二行歌词`;

        const result = parseLyrics(lyric);

        expect(result[0].text).toBe('这是第一行歌词');
        expect(result[1].text).toBe('这是第二行歌词');
    });

    it('应正确解析带翻译的歌词', () => {
        const lyric = `[00:00.00]原歌词
[00:05.00]原歌词2`;
        const tlyric = `[00:00.00]翻译歌词
[00:05.00]翻译歌词2`;

        const result = parseLyricsFromResponse(lyric, tlyric);

        expect(result.length).toBe(2);
        expect(result[0]).toEqual({ time: 0, text: '原歌词', ttext: '翻译歌词' });
        expect(result[1]).toEqual({ time: 5, text: '原歌词2', ttext: '翻译歌词2' });
    });

    it('应处理没有翻译的情况', () => {
        const lyric = `[00:00.00]原歌词`;

        const result = parseLyricsFromResponse(lyric, '');

        expect(result.length).toBe(1);
        expect(result[0].ttext).toBeUndefined();
    });

    it('应处理翻译数量不匹配的情况', () => {
        const lyric = `[00:00.00]第一行
[00:05.00]第二行
[00:10.00]第三行`;
        const tlyric = `[00:00.00]翻译1
[00:05.00]翻译2`;

        const result = parseLyricsFromResponse(lyric, tlyric);

        expect(result.length).toBe(3);
        expect(result[0].ttext).toBe('翻译1');
        expect(result[1].ttext).toBe('翻译2');
        expect(result[2].ttext).toBeUndefined();
    });
});

// API Types 测试
describe('API Types', () => {
    it('Song 接口应包含必要字段', () => {
        const song: Song = {
            id: '123',
            name: 'Test Song',
            artist: ['Artist 1', 'Artist 2'],
            album: 'Test Album',
            pic_id: 'pic123',
            lyric_id: 'lyric123',
            source: 'netease',
            pic_url: 'https://example.com/pic.jpg'
        };

        expect(song.id).toBe('123');
        expect(song.name).toBe('Test Song');
        expect(song.artist).toHaveLength(2);
        expect(song.source).toBe('netease');
        expect(song.pic_url).toBe('https://example.com/pic.jpg');
    });

    it('Song 接口支持可选字段', () => {
        const song: Song = {
            id: '123',
            name: 'Test Song',
            artist: ['Artist 1'],
            album: 'Test Album',
            pic_id: 'pic123',
            lyric_id: 'lyric123',
            source: 'netease'
        };

        expect(song.pic_url).toBeUndefined();
    });

    it('LyricLine 接口应包含时间和文本', () => {
        const lyricLine: LyricLine = {
            time: 10.5,
            text: '歌词内容'
        };

        expect(lyricLine.time).toBe(10.5);
        expect(lyricLine.text).toBe('歌词内容');
    });

    it('LyricLine 接口支持可选翻译字段', () => {
        const lyricLine: LyricLine = {
            time: 10.5,
            text: '原歌词',
            ttext: '翻译歌词'
        };

        expect(lyricLine.ttext).toBe('翻译歌词');
    });

    it('LyricResult 接口应包含歌词内容', () => {
        const lyricResult: LyricResult = {
            lyric: '[00:00.00]测试歌词',
            tlyric: '翻译歌词'
        };

        expect(lyricResult.lyric).toContain('测试歌词');
        expect(lyricResult.tlyric).toBe('翻译歌词');
    });

    it('PlaylistData 接口应包含歌单信息', () => {
        const playlist = {
            name: '我的歌单',
            songs: [] as Song[],
            id: 'playlist123',
            createTime: '2024-01-01T00:00:00Z',
            isFavorites: false
        };

        expect(playlist.name).toBe('我的歌单');
        expect(playlist.songs).toHaveLength(0);
        expect(playlist.isFavorites).toBe(false);
    });
});
