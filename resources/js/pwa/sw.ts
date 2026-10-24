/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

/**
 * Touch Dine service worker.
 *
 * Hard rule: never cache application data. Only build assets (injected below) and
 * static, non-tenant images are cached. Page navigations are always network-first
 * and page HTML is never written to a cache — an authenticated page or an Inertia
 * JSON response must never be served from disk to a different user or a stale state.
 */

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * Navigations: go to the network every time. Only when the network is
 * unreachable do we fall back to the precached offline shell. This is why the
 * SW is built with injectManifest rather than a generated navigateFallback —
 * a precached navigation fallback would serve the offline page even when online.
 */
registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
        try {
            return await fetch(event.request);
        } catch {
            const offline = await matchPrecache('/offline.html');

            return offline ?? Response.error();
        }
    },
);

/**
 * Self-hosted static chrome (app icons, brand marks). The pattern deliberately
 * allows only the web root and /brand/ — a single path segment — so uploaded
 * tenant files under /storage/... can never match and never enter a cache.
 */
registerRoute(
    ({ url }) => /^\/(?:brand\/)?[^/]+\.(?:png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname),
    new StaleWhileRevalidate({
        cacheName: 'app-chrome-assets',
        plugins: [
            new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
    }),
);

/** Web fonts only — no application endpoints. */
registerRoute(
    ({ url }) => /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(url.href),
    new StaleWhileRevalidate({
        cacheName: 'web-fonts',
        plugins: [
            new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
    }),
);

// The client asks the waiting worker to activate when the user accepts an update.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

clientsClaim();
