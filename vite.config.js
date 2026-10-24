import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Short commit SHA. Used as the revision for the precached offline shell so the
 * service worker re-fetches it whenever the code changes.
 */
function shortCommit() {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return 'dev';
    }
}

const commit = shortCommit();

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        VitePWA({
            // A hand-written service worker (resources/js/pwa/sw.ts) is required
            // so we control caching precisely. The generated `navigateFallback`
            // approach would serve the precached offline page for *every*
            // navigation, online or not, which breaks a server-rendered app.
            strategies: 'injectManifest',
            srcDir: 'resources/js/pwa',
            filename: 'sw.ts',
            registerType: 'prompt',
            injectRegister: null,
            manifest: {
                name: 'Touch Dine POS',
                short_name: 'Touch Dine',
                description: 'Restaurant point-of-sale — orders, kitchen, tables and reporting.',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                orientation: 'any',
                background_color: '#ffffff',
                theme_color: '#EC3013',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                shortcuts: [
                    { name: 'Point of Sale', short_name: 'POS', url: '/pos' },
                    { name: 'Kitchen', short_name: 'Kitchen', url: '/kitchen' },
                ],
            },
            injectManifest: {
                // Build assets only. Never .html, .json or anything served by a
                // controller — the offline shell is added explicitly below.
                globPatterns: ['**/*.{js,css,woff,woff2,png,svg,ico}'],
                additionalManifestEntries: [{ url: '/offline.html', revision: commit }],
            },
            devOptions: { enabled: false },
        }),
    ],
});
