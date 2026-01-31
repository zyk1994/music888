/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['js/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './test-coverage',
            exclude: [
                'js/**/*.test.ts',
                'js/types.ts',
                'js/config.ts',
                'node_modules/**',
            ],
            include: ['js/**/*.ts'],
        },
    },
});
