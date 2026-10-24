import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.js on purpose: the application build needs the
 * Laravel and PWA plugins, neither of which belongs in a unit-test run.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
    },
});
