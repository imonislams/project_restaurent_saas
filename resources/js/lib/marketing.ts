/**
 * Client-side marketing state: consent, tracking ids and the ingest call.
 *
 * Everything here is consent-aware by construction. `allows()` is the single check
 * every caller uses, so a new tracking call cannot accidentally bypass consent by
 * forgetting to ask.
 */

export type ConsentCategory = 'essential' | 'analytics' | 'advertising';

/**
 * Declared once, here. Tracking scripts and telemetry both touch these, and two
 * `declare global` blocks for the same window property conflict in TypeScript.
 */
declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        fbq?: (...args: unknown[]) => void;
        plausible?: (event: string, options?: { props: Record<string, unknown> }) => void;
    }
}

export interface MarketingTrackingConfig {
    meta_pixel: string | null;
    ga4: string | null;
    gtm: string | null;
    google_ads: { conversion_id: string; conversion_label: string } | null;
}

export interface MarketingConsentState {
    enabled: boolean;
    version: string;
    block_before_consent: boolean;
    defaults: Record<ConsentCategory, boolean>;
    granted: Record<ConsentCategory, boolean>;
    /** Whether this visitor has already made a choice. */
    recorded: boolean;
    text: string;
}

export interface MarketingPublicConfig {
    tracking: MarketingTrackingConfig;
    consent: MarketingConsentState;
    enabled_events: string[];
    collect_url: string;
    consent_url: string;
    visitor_cookie: string;
}

let config: MarketingPublicConfig | null = null;

/** Set once by the marketing provider on mount. */
export function configureMarketing(next: MarketingPublicConfig | null): void {
    config = next;
}

export function marketingConfig(): MarketingPublicConfig | null {
    return config;
}

/**
 * The one consent check. `essential` is always allowed; everything else requires an
 * explicit grant.
 */
export function allows(category: ConsentCategory = 'analytics'): boolean {
    if (category === 'essential') return true;

    const granted = config?.consent.granted;

    return Boolean(granted?.[category]);
}

export function tracking(): MarketingTrackingConfig | null {
    return config?.tracking ?? null;
}

export function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

export function visitorId(): string | null {
    return readCookie(config?.visitor_cookie ?? 'md_vid');
}

function csrfToken(): string | null {
    return readCookie('XSRF-TOKEN');
}

/**
 * Persist a consent decision. Returns the effective categories so the UI can settle
 * without a page reload — a reload here would record a second page view.
 */
export async function saveConsent(
    categories: Partial<Record<ConsentCategory, boolean>>,
    action: 'granted' | 'updated' | 'withdrawn' = 'granted',
): Promise<Record<ConsentCategory, boolean> | null> {
    const url = config?.consent_url ?? '/marketing/consent';

    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken() ? { 'X-XSRF-TOKEN': csrfToken() as string } : {}),
            },
            body: JSON.stringify({ categories, action }),
        });

        if (!response.ok) return null;

        const payload = (await response.json()) as { granted?: Record<ConsentCategory, boolean> };

        if (payload.granted && config) {
            config = { ...config, consent: { ...config.consent, granted: payload.granted, recorded: true } };
        }

        return payload.granted ?? null;
    } catch {
        return null;
    }
}

/**
 * Send one event to the internal ledger.
 *
 * Dropped when the category it belongs to has not been granted, so the server never
 * receives data the visitor did not agree to.
 */
export function collect(
    name: string,
    properties: Record<string, unknown> = {},
    category: ConsentCategory = 'analytics',
): void {
    if (!allows(category)) return;
    if (config !== null && config.enabled_events.length > 0 && !config.enabled_events.includes(name)) {
        return;
    }

    const url = config?.collect_url ?? '/marketing/events';

    try {
        void fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken() ? { 'X-XSRF-TOKEN': csrfToken() as string } : {}),
            },
            body: JSON.stringify({
                name,
                path: typeof window !== 'undefined' ? window.location.pathname : null,
                url: typeof window !== 'undefined' ? window.location.href : null,
                referrer: typeof document !== 'undefined' ? document.referrer || null : null,
                properties,
            }),
        });
    } catch {
        // Telemetry must never break the interaction that produced it.
    }
}
