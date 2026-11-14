import { useEffect, useRef } from 'react';
import { allows, tracking } from '@/lib/marketing';

function injectScript(id: string, html?: string, src?: string): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(id)) return;

    const script = document.createElement('script');
    script.id = id;
    script.async = true;

    if (src) script.src = src;
    if (html) script.textContent = html;

    document.head.appendChild(script);
}

/**
 * Loads the configured tags — and only those the visitor has consented to.
 *
 * Consent mode: a denied default is pushed **before** any tag loads, and updated
 * once a decision exists, so a container cannot fire ahead of the visitor's choice.
 * Nothing is injected at all while the relevant category is denied.
 */
export default function TrackingScripts() {
    const loaded = useRef(false);
    const config = tracking();

    useEffect(() => {
        if (typeof window === 'undefined' || loaded.current) return;
        loaded.current = true;

        const analytics = allows('analytics');
        const advertising = allows('advertising');

        if (!analytics && !advertising && !config) return;

        // 1. Consent default first, always.
        window.dataLayer = window.dataLayer || [];
        window.gtag =
            window.gtag ||
            function gtag(...args: unknown[]) {
                (window.dataLayer as unknown[]).push(args);
            };

        window.gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500,
        });

        window.gtag('consent', 'update', {
            analytics_storage: analytics ? 'granted' : 'denied',
            ad_storage: advertising ? 'granted' : 'denied',
            ad_user_data: advertising ? 'granted' : 'denied',
            ad_personalization: advertising ? 'granted' : 'denied',
        });

        if (!config) return;

        // 2. Google Tag Manager (analytics consent).
        if (analytics && config.gtm) {
            injectScript(
                'gtm-script',
                `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
                    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
                    `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
                    `})(window,document,'script','dataLayer','${config.gtm}');`,
            );
        }

        // 3. GA4 (analytics consent).
        if (analytics && config.ga4) {
            injectScript('ga4-src', undefined, `https://www.googletagmanager.com/gtag/js?id=${config.ga4}`);
            window.gtag('js', new Date());
            window.gtag('config', config.ga4, { anonymize_ip: true });
        }

        // 4. Google Ads conversion tracking (advertising consent).
        if (advertising && config.google_ads) {
            injectScript('ads-src', undefined, `https://www.googletagmanager.com/gtag/js?id=${config.google_ads.conversion_id}`);
            window.gtag('js', new Date());
            window.gtag('config', config.google_ads.conversion_id);
        }

        // 5. Meta Pixel (advertising consent).
        if (advertising && config.meta_pixel) {
            injectScript(
                'meta-pixel',
                `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
                    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
                    `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
                    `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',` +
                    `'https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.meta_pixel}');fbq('track','PageView');`,
            );
        }
    }, [config]);

    return null;
}
