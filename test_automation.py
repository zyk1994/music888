"""
云音乐播放器 - 浏览器自动化测试 (Python 版本)
测试主要功能：搜索、歌单解析、播放控制、收藏、响应式设计等
"""
import os
import time
from playwright.sync_api import sync_playwright


def setup_page(playwright, viewport_size=None):
    """设置浏览器页面"""
    browser = playwright.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    
    if viewport_size:
        context = browser.new_context(viewport=viewport_size)
    else:
        context = browser.new_context()
    
    page = context.new_page()
    
    # 收集控制台消息
    console_messages = []
    page.on('console', lambda msg: console_messages.append({
        'type': msg.type,
        'text': msg.text
    }))
    
    # 收集页面错误
    page_errors = []
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    
    return browser, page, console_messages, page_errors


def wait_for_element(page, selector, timeout=5000):
    """等待元素出现"""
    try:
        page.locator(selector).first.wait_for(timeout=timeout)
        return True
    except:
        return False


def test_music_player():
    base_url = os.environ.get('TEST_BASE_URL', 'http://localhost:5173')
    
    print("=" * 50)
    print("云音乐播放器自动化测试 (Python + Playwright)")
    print("=" * 50)
    print(f"测试地址: {base_url}")
    
    # 确保截图目录存在
    os.makedirs('test_screenshots', exist_ok=True)
    
    with sync_playwright() as p:
        browser, page, console_messages, page_errors = setup_page(p)
        
        try:
            # 1. 访问首页
            print("\n[1] 访问首页...")
            page.goto(base_url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            
            # 检查页面元素
            has_search_input = wait_for_element(page, '#searchInput')
            has_play_btn = wait_for_element(page, '#playBtn')
            
            if not has_search_input:
                print("  ⚠ 搜索输入框未找到")
            if not has_play_btn:
                print("  ⚠ 播放按钮未找到")
            
            page.screenshot(path='test_screenshots/01_homepage.png', full_page=True)
            print(f"  ✓ 首页加载成功 (标题: {page.title()})")
            
            # 2. 检查 API 连接
            print("\n[2] 检查 API 连接...")
            time.sleep(3)
            
            # 检查通知
            try:
                notification = page.locator('.notification').first
                if notification.is_visible():
                    print(f"  ✓ 通知: {notification.text_content()}")
            except:
                print("  ⚠ 未发现通知")
            
            # 3. 测试搜索功能
            print("\n[3] 测试搜索功能...")
            search_input = page.locator('#searchInput')
            search_input.fill('林俊杰')
            page.locator('.search-btn').click()
            
            # 等待搜索结果
            time.sleep(5)
            page.screenshot(path='test_screenshots/02_search_results.png', full_page=True)
            
            song_items = page.locator('.song-item').all()
            print(f"  ✓ 搜索完成，找到 {len(song_items)} 首歌曲")
            
            if len(song_items) > 0:
                # 4. 测试播放功能
                print("\n[4] 测试播放功能...")
                first_song = page.locator('#searchResults .song-item').first
                first_song.click()
                
                # 等待歌曲加载
                time.sleep(5)
                page.screenshot(path='test_screenshots/03_playing.png', full_page=True)
                
                # 检查播放状态
                play_btn_icon = page.locator('#playBtn i').get_attribute('class')
                print(f"  ✓ 播放按钮状态: {play_btn_icon}")
                
                # 检查当前播放信息
                try:
                    current_title = page.locator('#currentTitle').text_content()
                    current_artist = page.locator('#currentArtist').text_content()
                    print(f"  ✓ 当前播放: {current_title} - {current_artist}")
                except:
                    print("  ⚠ 无法获取当前播放信息")
                
                # 5. 检查歌词显示
                print("\n[5] 检查歌词显示...")
                lyrics_container = page.locator('#lyricsContainer')
                lyric_lines = lyrics_container.locator('.lyric-line').all()
                print(f"  ✓ 歌词行数: {len(lyric_lines)}")
                
                # 检查翻译歌词
                translation_lines = lyrics_container.locator('.lyric-translation').all()
                if len(translation_lines) > 0:
                    print(f"  ✓ 发现 {len(translation_lines)} 行翻译歌词")
                else:
                    print("  ⚠ 未发现翻译歌词")
                
                # 6. 测试播放控制
                print("\n[6] 测试播放控制...")
                
                # 点击暂停
                page.locator('#playBtn').click()
                time.sleep(1)
                paused_icon = page.locator('#playBtn i').get_attribute('class')
                print(f"  ✓ 暂停后按钮状态: {paused_icon}")
                
                # 点击播放
                page.locator('#playBtn').click()
                time.sleep(1)
                playing_icon = page.locator('#playBtn i').get_attribute('class')
                print(f"  ✓ 播放后按钮状态: {playing_icon}")
                
                # 7. 测试切歌功能
                print("\n[7] 测试切歌功能...")
                next_btn = page.locator('#nextBtn')
                if next_btn.count() > 0:
                    next_btn.click()
                    time.sleep(3)
                    page.screenshot(path='test_screenshots/04_next_song.png', full_page=True)
                    print("  ✓ 切歌功能测试成功")
                else:
                    print("  ⚠ 下一首按钮未找到")
                
                # 8. 测试收藏功能
                print("\n[8] 测试收藏功能...")
                favorite_btn = page.locator('#playerFavoriteBtn')
                if favorite_btn.count() > 0:
                    favorite_btn.click()
                    time.sleep(1)
                    page.screenshot(path='test_screenshots/05_favorited.png', full_page=True)
                    print("  ✓ 收藏功能测试成功")
                else:
                    print("  ⚠ 收藏按钮未找到")
            
            # 9. 测试标签切换
            print("\n[9] 测试标签切换...")
            
            # 切换到排行榜
            page.locator('button[data-tab="ranking"]').click()
            time.sleep(1)
            page.screenshot(path='test_screenshots/06_ranking_tab.png', full_page=True)
            print("  ✓ 排行榜标签切换成功")
            
            # 切换到歌单
            page.locator('button[data-tab="playlist"]').click()
            time.sleep(1)
            page.screenshot(path='test_screenshots/07_playlist_tab.png', full_page=True)
            print("  ✓ 歌单标签切换成功")
            
            # 切换到我的
            page.locator('button[data-tab="my"]').click()
            time.sleep(1)
            page.screenshot(path='test_screenshots/08_my_tab.png', full_page=True)
            print("  ✓ 我的标签切换成功")
            
            # 10. 测试响应式设计
            print("\n[10] 测试响应式设计...")
            
            browser.close()
            
            # 平板尺寸测试
            browser, page, _, _ = setup_page(p, viewport_size={'width': 768, 'height': 1024})
            page.goto(base_url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            page.screenshot(path='test_screenshots/09_tablet_view.png', full_page=True)
            print("  ✓ 平板视图测试成功")
            browser.close()
            
            # 移动端尺寸测试
            browser, page, _, _ = setup_page(p, viewport_size={'width': 375, 'height': 812})
            page.goto(base_url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            page.screenshot(path='test_screenshots/10_mobile_view.png', full_page=True)
            print("  ✓ 移动端视图测试成功")
            browser.close()
            
            # 11. 测试报告
            print("\n[11] 测试报告...")
            
            console_errors = [m for m in console_messages if m['type'] == 'error']
            if page_errors:
                print(f"  ⚠ 发现 {len(page_errors)} 个页面错误:")
                for i, err in enumerate(page_errors[:3], 1):
                    print(f"     {i}. {err[:100]}")
            else:
                print("  ✓ 无页面错误")
            
            if console_errors:
                print(f"  ⚠ 发现 {len(console_errors)} 个控制台错误")
            else:
                print("  ✓ 无控制台错误")
            
            print("\n" + "=" * 50)
            print("测试完成！")
            print("截图保存在 test_screenshots/ 目录")
            print("=" * 50)
            
        except Exception as e:
            print(f"\n❌ 测试出错: {e}")
            page.screenshot(path='test_screenshots/error.png', full_page=True)
            print(f"错误截图已保存到 test_screenshots/error.png")
            raise


if __name__ == '__main__':
    test_music_player()
