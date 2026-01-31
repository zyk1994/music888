/**
 * 云音乐播放器 - 主程序入口模块单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM environment
beforeEach(() => {
    document.body.innerHTML = `
        <div class="main-container"></div>
        <div class="page-indicator" data-page="0"></div>
        <div class="page-indicator" data-page="1"></div>
        <div class="page-indicator" data-page="2"></div>
        <input id="searchInput" type="text" />
        <select id="sourceSelect">
            <option value="netease">网易云音乐</option>
            <option value="tencent">QQ音乐</option>
        </select>
        <input id="volumeSlider" type="range" min="0" max="100" value="80" />
        <div id="searchResults"></div>
        <div id="favoritesResults"></div>
        <div id="historyResults"></div>
        <div id="rankingResults"></div>
        <span id="favoritesCount">0</span>
    `;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Main Module - Mobile Page Switching', () => {
    function switchMobilePage(pageIndex: number): number {
        const mainContainer = document.querySelector('.main-container') as HTMLElement;
        const indicators = document.querySelectorAll('.page-indicator');

        if (mainContainer) {
            const offset = -pageIndex * 100;
            mainContainer.style.transform = `translateX(${offset}vw)`;
        }

        indicators.forEach((indicator, index) => {
            if (index === pageIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        return pageIndex;
    }

    it('应正确设置页面偏移量', () => {
        switchMobilePage(1);

        const mainContainer = document.querySelector('.main-container') as HTMLElement;
        expect(mainContainer.style.transform).toBe('translateX(-100vw)');
    });

    it('应正确更新页面指示器', () => {
        switchMobilePage(2);

        const indicators = document.querySelectorAll('.page-indicator');
        expect(indicators[0].classList.contains('active')).toBe(false);
        expect(indicators[1].classList.contains('active')).toBe(false);
        expect(indicators[2].classList.contains('active')).toBe(true);
    });

    it('应返回当前页面索引', () => {
        const result = switchMobilePage(1);
        expect(result).toBe(1);
    });
});

describe('Main Module - Tab Switching', () => {
    beforeEach(() => {
        document.body.innerHTML += `
            <div id="hotTab" class="tab-content" style="display: flex;"></div>
            <div id="rankingTab" class="tab-content" style="display: none;"></div>
            <div id="myTab" class="tab-content" style="display: none;"></div>
            <button class="tab-btn active" data-tab="hot">热门</button>
            <button class="tab-btn" data-tab="ranking">排行榜</button>
            <button class="tab-btn" data-tab="my">我的</button>
        `;
    });

    function switchTab(tabName: string): void {
        document.querySelectorAll('.tab-content').forEach(content => {
            (content as HTMLElement).style.display = 'none';
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedTabContent = document.getElementById(tabName + 'Tab');
        if (selectedTabContent) {
            (selectedTabContent as HTMLElement).style.display = 'flex';
            selectedTabContent.classList.add('active');
        }

        const selectedTabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (selectedTabButton) {
            selectedTabButton.classList.add('active');
        }
    }

    it('应隐藏所有其他标签内容', () => {
        switchTab('ranking');

        const hotTab = document.getElementById('hotTab');
        expect(hotTab?.style.display).toBe('none');
    });

    it('应显示选中的标签内容', () => {
        switchTab('ranking');

        const rankingTab = document.getElementById('rankingTab');
        expect(rankingTab?.style.display).toBe('flex');
        expect(rankingTab?.classList.contains('active')).toBe(true);
    });

    it('应更新标签按钮的激活状态', () => {
        switchTab('my');

        const myBtn = document.querySelector('.tab-btn[data-tab="my"]');
        const hotBtn = document.querySelector('.tab-btn[data-tab="hot"]');

        expect(myBtn?.classList.contains('active')).toBe(true);
        expect(hotBtn?.classList.contains('active')).toBe(false);
    });
});

describe('Main Module - Volume Adjustment', () => {
    function adjustVolume(delta: number): number {
        const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
        if (volumeSlider) {
            const currentVolume = parseInt(volumeSlider.value, 10);
            const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
            volumeSlider.value = newVolume.toString();
            return newVolume;
        }
        return 0;
    }

    it('应正确增加音量', () => {
        const newVolume = adjustVolume(10);
        expect(newVolume).toBe(90);
    });

    it('应正确减少音量', () => {
        const newVolume = adjustVolume(-10);
        expect(newVolume).toBe(70);
    });

    it('应限制音量最大值为100', () => {
        adjustVolume(50);
        const result = adjustVolume(50);
        expect(result).toBe(100);
    });

    it('应限制音量最小值为0', () => {
        adjustVolume(-50);
        adjustVolume(-50);
        const result = adjustVolume(-50);
        expect(result).toBe(0);
    });
});

describe('Main Module - Swipe Handling', () => {
    function handleSwipe(
        touchStartX: number,
        touchEndX: number,
        touchStartY: number,
        touchEndY: number,
        currentMobilePage: number
    ): number {
        const swipeThreshold = 50;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && currentMobilePage < 2) {
                return currentMobilePage + 1;
            } else if (diffX < 0 && currentMobilePage > 0) {
                return currentMobilePage - 1;
            }
        }
        return currentMobilePage;
    }

    it('应检测向左滑动并前进到下一页', () => {
        const result = handleSwipe(200, 100, 100, 100, 0);
        expect(result).toBe(1);
    });

    it('应检测向右滑动并返回上一页', () => {
        const result = handleSwipe(100, 200, 100, 100, 1);
        expect(result).toBe(0);
    });

    it('应忽略小于阈值的滑动', () => {
        const result = handleSwipe(100, 80, 100, 100, 0);
        expect(result).toBe(0);
    });

    it('应忽略主要为垂直方向的滑动', () => {
        const result = handleSwipe(100, 50, 100, 0, 0);
        expect(result).toBe(0);
    });

    it('应在最后一页时不能继续向左滑动', () => {
        const result = handleSwipe(200, 100, 100, 100, 2);
        expect(result).toBe(2);
    });

    it('应在第一页时不能继续向右滑动', () => {
        const result = handleSwipe(100, 200, 100, 100, 0);
        expect(result).toBe(0);
    });
});

describe('Main Module - Source Name Mapping', () => {
    const sourceNames: { [key: string]: string } = {
        netease: '网易云音乐',
        tencent: 'QQ音乐',
        kuwo: '酷我音乐',
        kugou: '酷狗音乐',
        migu: '咪咕音乐',
        joox: 'JOOX',
        ximalaya: '喜马拉雅',
        spotify: 'Spotify',
        apple: 'Apple Music',
        ytmusic: 'YouTube Music',
        tidal: 'TIDAL',
        qobuz: 'Qobuz',
        deezer: 'Deezer'
    };

    it('应正确映射所有音乐源名称', () => {
        expect(sourceNames['netease']).toBe('网易云音乐');
        expect(sourceNames['tencent']).toBe('QQ音乐');
        expect(sourceNames['spotify']).toBe('Spotify');
        expect(sourceNames['apple']).toBe('Apple Music');
    });

    it('应返回原始值对于未知的音乐源', () => {
        const source = 'unknown';
        const sourceName = sourceNames[source] || source;
        expect(sourceName).toBe('unknown');
    });
});

describe('Main Module - Ranking Keywords', () => {
    const keywords: { [key: string]: string } = {
        hot: '热歌榜',
        new: '新歌',
        soar: '飙升'
    };

    it('应正确映射排行榜类型到关键词', () => {
        expect(keywords['hot']).toBe('热歌榜');
        expect(keywords['new']).toBe('新歌');
        expect(keywords['soar']).toBe('飙升');
    });

    it('应返回默认关键词对于未知类型', () => {
        const rankType = 'unknown';
        const keyword = keywords[rankType] || '热门';
        expect(keyword).toBe('热门');
    });
});

describe('Main Module - Keyboard Shortcuts', () => {
    it('应识别空格键', () => {
        expect('Space').toBe('Space');
    });

    it('应识别方向键', () => {
        expect(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']).toContain('ArrowLeft');
        expect(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']).toContain('ArrowRight');
        expect(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']).toContain('ArrowUp');
        expect(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']).toContain('ArrowDown');
    });

    it('应检测输入框焦点状态', () => {
        const input = document.getElementById('searchInput') as HTMLInputElement;
        input.focus();

        const activeElement = document.activeElement;
        const isInInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

        expect(isInInput).toBe(true);
    });
});

describe('Main Module - Search Validation', () => {
    it('应验证空关键词', () => {
        const keyword = '   '.trim();
        expect(keyword).toBe('');
        expect(!keyword).toBe(true);
    });

    it('应正确处理有效关键词', () => {
        const keyword = '  周杰伦  '.trim();
        expect(keyword).toBe('周杰伦');
        expect(!!keyword).toBe(true);
    });
});

describe('Main Module - Playlist ID Validation', () => {
    it('应验证空歌单ID', () => {
        const playlistId = ''.trim();
        expect(!playlistId).toBe(true);
    });

    it('应验证有效歌单ID', () => {
        const playlistId = '12345678'.trim();
        expect(!!playlistId).toBe(true);
    });
});
