import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: 'localhost',
        port: 5173,
        strictPort: false,
        // 修复 HMR WebSocket 连接问题
        hmr: {
            host: 'localhost',
            port: 5173,
        },
    },
});
