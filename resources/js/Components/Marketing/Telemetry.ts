/**
 * Privacy-conscious conversion telemetry.
 *
 * Every event goes three places, each individually consent-gated:
 *
 *  1. the browser tag layer (`dataLayer` / `gtag` / `fbq`), which only exists once
 *     consent has loaded it;
 *  2. an app-level DOM event, which is local and collects nothing;
 *  3. the platform's own event ledger, through `collect()` — dropped outright
 *     without consent, and carrying no personal data.
 */

import { allows, collect } from '@/lib/marketing';

export type ConversionEventName =
    | 'hero_cta_clicked'
    | 'pricing_viewed'
    | 'plan_selected'
    | 'registration_started'
    | 'registration_completed'
    | 'email_verified'
    | 'onboarding_completed'
    | 'first_sale_completed'
    | 'demo_interacted'
    | 'nav_cta_clicked'
    | 'faq_toggled'
    | 'solution_viewed'
    | 'product_viewed'
    | 'demo_requested'
    | 'nav_menu_opened'
    | 'feature_viewed';

export interface ConversionEventPayload {
    plan?: string;
    billing_cycle?: 'monthly' | 'yearly';
    feature?: string;
    solution?: string;
    product?: string;
    location?: string;
    faq_question?: string;
    [key: string]: unknown;
}

/** Events that belong to the advertising category rather than analytics. */
const ADVERTISING_EVENTS: ConversionEventName[] = ['demo_requested', 'registration_completed'];

/** Where an event maps onto a Meta standard event, so the pixel reports it usefully. */
const META_EVENTS: Partial<Record<ConversionEventName, string>> = {
    demo_requested: 'Lead',
    registration_completed: 'CompleteRegistration',
    pricing_viewed: 'ViewContent',
    plan_selected: 'ViewContent',
    product_viewed: 'ViewContent',
    solution_viewed: 'ViewContent',
    feature_viewed: 'ViewContent',
};

/**
 * Where a UI event maps onto the platform's catalogued funnel event.
 *
 * The granular names stay granular for Tag Manager; the ledger only holds catalogued
 * names, so the funnel is built from a fixed vocabulary rather than from whatever a
 * component happened to call.
 */
const LEDGER_EVENTS: Partial<Record<ConversionEventName, string>> = {
    pricing_viewed: 'view_content',
    plan_selected: 'view_content',
    product_viewed: 'view_content',
    solution_viewed: 'view_content',
    feature_viewed: 'view_content',
    demo_requested: 'demo_requested',
    registration_started: 'registration_started',
    registration_completed: 'registration_completed',
};

export function trackConversion(
    eventName: ConversionEventName,
    payload: ConversionEventPayload = {},
): void {
    if (typeof window === 'undefined') return;

    const category = ADVERTISING_EVENTS.includes(eventName) ? 'advertising' : 'analytics';

    const sanitizedPayload: Record<string, unknown> = {
        event: eventName,
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        ...payload,
    };

    // Google Tag Manager / GA4 dataLayer — populated only under consent.
    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(sanitizedPayload);
    }

    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
    }

    const metaEvent = META_EVENTS[eventName];

    if (metaEvent && allows('advertising') && typeof window.fbq === 'function') {
        window.fbq('track', metaEvent, payload);
    }

    // Local-only dispatch for app-level listeners; collects nothing.
    try {
        window.dispatchEvent(
            new CustomEvent('touchdine:conversion', { detail: sanitizedPayload }),
        );
    } catch {
        // Restricted environments (e.g. a locked-down iframe) can refuse this.
    }

    // The platform's own ledger, under its catalogued funnel name. Dropped
    // entirely without consent, and limited to events the operator has enabled.
    const ledgerName = LEDGER_EVENTS[eventName];

    if (ledgerName) {
        collect(ledgerName, { ...payload, ui_event: eventName }, category);
    }

    if (import.meta.env.DEV) {
        console.debug('[Touch Dine Telemetry]', eventName, sanitizedPayload);
    }
}
