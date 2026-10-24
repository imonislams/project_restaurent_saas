import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const LOOKUPS = ['https://ipwho.is/', 'https://ipinfo.io/json'];

// Module-level guard: detect once per full page load. Inertia SPA navigations
// reuse the module (so they don't re-hit the service), while a browser reload
// resets it — pressing F5 after switching VPN re-detects immediately.
let checkedThisLoad = false;

/**
 * Ask a public geo endpoint for the browser's country. Returns an ISO-2 code.
 * Tries each provider in turn; any failure falls through to the next.
 */
async function lookupCountry(urls: string[]): Promise<string | null> {
    for (const url of urls) {
        try {
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { Accept: 'application/json, text/plain' },
            });

            if (!res.ok) continue;

            const text = (await res.text()).trim();
            let code: string | null = null;

            if (/^[A-Za-z]{2}$/.test(text)) {
                code = text.toUpperCase();
            } else {
                try {
                    const json = JSON.parse(text) as Record<string, unknown>;
                    const raw = json.country_code ?? json.country ?? json.countryCode;
                    code = typeof raw === 'string' ? raw.toUpperCase() : null;
                } catch {
                    code = null;
                }
            }

            if (code && /^[A-Z]{2}$/.test(code)) return code;
        } catch {
            // try the next provider
        }
    }

    return null;
}

/**
 * The server-side country header (Cloudflare/Vercel) is authoritative. When it
 * is unavailable (local dev, or a host without a geo header) the browser's
 * public IP is used instead, so pricing follows the visitor's real location —
 * including a VPN. The detected country is stored in a cookie and re-checked at
 * most every few minutes to avoid hammering the lookup service.
 */
export function usePricingRegion(): void {
    const props = usePage().props as Record<string, any>;
    const source = props.pricing_region_source as string | undefined;
    const region = props.pricing_region as string | undefined;
    const cookieName = (props.pricing_country_cookie as string | undefined) ?? 'pricing_country';
    const configuredLookup = (props.pricing_geo_lookup_url as string | undefined) ?? '';
    const lookups = configuredLookup !== '' ? [configuredLookup, ...LOOKUPS] : LOOKUPS;

    useEffect(() => {
        // The server already knows the country from a trusted header.
        if (source === 'header' || checkedThisLoad) return;
        checkedThisLoad = true;

        let cancelled = false;

        lookupCountry(lookups).then((code) => {
            if (cancelled || !code) return;

            const nextRegion = code === 'BD' ? 'bd' : 'international';

            document.cookie = `${cookieName}=${code}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

            if (nextRegion !== region) {
                router.reload();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [source, region, cookieName]);
}
