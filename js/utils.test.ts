/**
 * 云音乐播放器 - 工具函数单元测试
 */
import { escapeHtml, formatTime, debounce, throttle } from './utils';

describe('escapeHtml', () => {
    it('应正确转义 HTML 特殊字符', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert("xss")&lt;/script&gt;'
        );
    });

    it('应处理空字符串', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('应处理 null 和 undefined', () => {
        expect(escapeHtml(null as unknown as string)).toBe('');
        expect(escapeHtml(undefined as unknown as string)).toBe('');
    });

    it('应保留普通文本', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });
});

describe('formatTime', () => {
    it('应正确格式化秒数为 mm:ss', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(65)).toBe('1:05');
        expect(formatTime(125)).toBe('2:05');
        expect(formatTime(600)).toBe('10:00');
    });

    it('应处理非法输入', () => {
        expect(formatTime(-1)).toBe('0:00');
        expect(formatTime(NaN)).toBe('0:00');
        expect(formatTime(Infinity)).toBe('0:00');
    });
});

describe('debounce', () => {
    it('应延迟执行函数', async () => {
        let callCount = 0;
        const fn = debounce(() => { callCount++; }, 50);

        fn();
        fn();
        fn();

        expect(callCount).toBe(0);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(callCount).toBe(1);
    });
});

describe('throttle', () => {
    it('应限制函数执行频率', async () => {
        let callCount = 0;
        const fn = throttle(() => { callCount++; }, 50);

        fn();
        fn();
        fn();

        expect(callCount).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 100));

        fn();
        expect(callCount).toBe(2);
    });
});
