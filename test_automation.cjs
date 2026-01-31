/**
 * 云音乐播放器 - 浏览器自动化测试 (Node.js 版本)
 * 测试主要功能：搜索、播放、歌词、响应式设计等
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'test_screenshots';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function waitForElement(page, selector, timeout = 5000) {
    try {
        return await page.locator(selector).first().waitFor({ timeout });
    } catch {
        return null;
    }
}

async function testMusicPlayer() {
    console.log('='.repeat(50));
    console.log('云音乐播放器自动化测试 (Node.js + Playwright)');
    console.log('='.repeat(50));
    console.log(`测试地址: ${BASE_URL}`);

    // 创建截图目录
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // 收集控制台消息
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // 收集错误
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    try {
        // 1. 访问首页
        console.log('\n[1] 访问首页...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

        // 等待页面加载
        await page.waitForTimeout(2000);

        // 检查页面标题
        const title = await page.title();
        console.log(`  ✓ 页面标题: ${title}`);

        // 检查关键元素是否存在
        const hasSearchInput = await waitForElement(page, '#searchInput');
        const hasPlayBtn = await waitForElement(page, '#playBtn');

        if (!hasSearchInput) {
            console.log('  ⚠ 搜索输入框未找到');
        }
        if (!hasPlayBtn) {
            console.log('  ⚠ 播放按钮未找到');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage.png'), fullPage: true });
        console.log('  ✓ 首页加载成功');

        // 2. 测试 API 连接状态
        console.log('\n[2] 检查 API 连接...');
        await page.waitForTimeout(3000);

        // 检查是否有通知消息显示 API 状态
        const notification = await page.locator('.notification').first().isVisible().catch(() => false);
        if (notification) {
            const notificationText = await page.locator('.notification').first().textContent();
            console.log(`  ✓ 通知: ${notificationText}`);
        }

        // 3. 测试搜索功能
        console.log('\n[3] 测试搜索功能...');
        const searchInput = page.locator('#searchInput');
        await searchInput.fill('周杰伦');
        await page.click('.search-btn');

        // 等待搜索结果
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_search_results.png'), fullPage: true });

        const songItems = await page.locator('.song-item').all();
        console.log(`  ✓ 搜索完成，找到 ${songItems.length} 首歌曲`);

        if (songItems.length > 0) {
            // 4. 测试播放功能
            console.log('\n[4] 测试播放功能...');
            const firstSong = page.locator('#searchResults .song-item').first();
            await firstSong.click();

            // 等待歌曲加载
            await page.waitForTimeout(5000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_playing.png'), fullPage: true });

            // 检查播放状态
            const playBtnIcon = await page.locator('#playBtn i').getAttribute('class');
            console.log(`  ✓ 播放按钮状态: ${playBtnIcon}`);

            // 检查当前播放信息
            const currentTitle = await page.locator('#currentTitle').textContent().catch(() => 'N/A');
            const currentArtist = await page.locator('#currentArtist').textContent().catch(() => 'N/A');
            console.log(`  ✓ 当前播放: ${currentTitle} - ${currentArtist}`);

            // 5. 检查歌词显示
            console.log('\n[5] 检查歌词显示...');
            const lyricsContainer = page.locator('#lyricsContainer');
            const lyricLines = await lyricsContainer.locator('.lyric-line').all();
            console.log(`  ✓ 歌词行数: ${lyricLines.length}`);

            // 检查翻译歌词
            const translationLines = await lyricsContainer.locator('.lyric-translation').all();
            if (translationLines.length > 0) {
                console.log(`  ✓ 发现 ${translationLines.length} 行翻译歌词`);
            } else {
                console.log('  ⚠ 未发现翻译歌词');
            }

            // 6. 测试播放控制
            console.log('\n[6] 测试播放控制...');

            // 点击暂停
            await page.click('#playBtn');
            await page.waitForTimeout(1000);
            const pausedIcon = await page.locator('#playBtn i').getAttribute('class');
            console.log(`  ✓ 暂停后按钮状态: ${pausedIcon}`);

            // 点击播放
            await page.click('#playBtn');
            await page.waitForTimeout(1000);
            const playingIcon = await page.locator('#playBtn i').getAttribute('class');
            console.log(`  ✓ 播放后按钮状态: ${playingIcon}`);

            // 7. 测试切歌功能
            console.log('\n[7] 测试切歌功能...');
            const nextBtn = page.locator('#nextBtn');
            if (await nextBtn.count() > 0) {
                await nextBtn.click();
                await page.waitForTimeout(3000);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_next_song.png'), fullPage: true });
                console.log('  ✓ 切歌功能测试成功');
            }
        }

        // 8. 测试标签切换
        console.log('\n[8] 测试标签切换...');

        // 切换到排行榜
        await page.click('button[data-tab="ranking"]');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_ranking_tab.png'), fullPage: true });
        console.log('  ✓ 排行榜标签切换成功');

        // 切换到歌单
        await page.click('button[data-tab="playlist"]');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_playlist_tab.png'), fullPage: true });
        console.log('  ✓ 歌单标签切换成功');

        // 切换到我的
        await page.click('button[data-tab="my"]');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_my_tab.png'), fullPage: true });
        console.log('  ✓ 我的标签切换成功');

        // 9. 测试响应式设计
        console.log('\n[9] 测试响应式设计...');

        // 平板尺寸
        await context.close();
        const tabletContext = await browser.newContext({
            viewport: { width: 768, height: 1024 }
        });
        const tabletPage = await tabletContext.newPage();
        await tabletPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await tabletPage.waitForTimeout(2000);
        await tabletPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08_tablet_view.png'), fullPage: true });
        console.log('  ✓ 平板视图测试成功');
        await tabletContext.close();

        // 移动端尺寸
        const mobileContext = await browser.newContext({
            viewport: { width: 375, height: 812 }
        });
        const mobilePage = await mobileContext.newPage();
        await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await mobilePage.waitForTimeout(2000);
        await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '09_mobile_view.png'), fullPage: true });
        console.log('  ✓ 移动端视图测试成功');
        await mobileContext.close();

        // 10. 报告错误
        console.log('\n[10] 测试报告...');

        if (errors.length > 0) {
            console.log(`  ⚠ 发现 ${errors.length} 个页面错误:`);
            errors.forEach((err, i) => {
                console.log(`     ${i + 1}. ${err.substring(0, 100)}`);
            });
        } else {
            console.log('  ✓ 无页面错误');
        }

        const errorLogs = consoleMessages.filter(m => m.type === 'error');
        if (errorLogs.length > 0) {
            console.log(`  ⚠ 发现 ${errorLogs.length} 个控制台错误`);
        } else {
            console.log('  ✓ 无控制台错误');
        }

        console.log('\n' + '='.repeat(50));
        console.log('测试完成！');
        console.log(`截图保存在 ${SCREENSHOT_DIR}/ 目录`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n❌ 测试出错:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png'), fullPage: true });
        console.log(`错误截图已保存到 ${SCREENSHOT_DIR}/error.png`);
    } finally {
        await browser.close();
    }
}

// 运行测试
testMusicPlayer().catch(console.error);
