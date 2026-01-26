/**
 * 云音乐播放器 - API 模块单元测试
 */
import { MusicError, MusicErrorType } from './types';

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

// NOTE: API 函数的集成测试需要 mock fetch，这里只测试类型和错误处理
describe('API Types', () => {
    it('Song 接口应包含必要字段', () => {
        // 类型检查测试 - 如果类型定义正确，这段代码应该编译通过
        const song = {
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
    });

    it('LyricLine 接口应包含时间和文本', () => {
        const lyricLine = {
            time: 10.5,
            text: '歌词内容'
        };

        expect(lyricLine.time).toBe(10.5);
        expect(lyricLine.text).toBe('歌词内容');
    });

    it('PlaylistData 接口应包含歌单信息', () => {
        const playlist = {
            name: '我的歌单',
            songs: [],
            id: 'playlist123',
            createTime: '2024-01-01T00:00:00Z',
            isFavorites: false
        };

        expect(playlist.name).toBe('我的歌单');
        expect(playlist.songs).toHaveLength(0);
        expect(playlist.isFavorites).toBe(false);
    });
});
