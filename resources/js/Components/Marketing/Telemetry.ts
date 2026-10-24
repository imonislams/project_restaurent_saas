/**
 * Privacy-conscious conversion telemetry and analytics dispatcher.
 * Prepares the platform for GA4, PostHog, or Plausible without sending
 * PII, passwords, payment info, or tenant-isolated private data.
 */

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
    | 'feature_viewed';

export interface ConversionEventPayload {
    plan?: string;
    billing_cycle?: 'monthly' | 'yearly';
    feature?: string;
    solution?: string;
    location?: string;
    faq_question?: string;
    [key: string]: unknown;
}

declare global {
    interface Window {
        dataLayer?: unknown[];
        plausible?: (event: string, options?: { props: Record<string, unknown> }) => void;
        gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
    }
}

export function trackConversion(
    eventName: ConversionEventName,
    payload: ConversionEventPayload = {}
): void {
    if (typeof window === 'undefined') return;

    const sanitizedPayload: Record<string, unknown> = {
        event: eventName,
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        ...payload,
    };

    // Google Tag Manager / GA4 dataLayer
    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(sanitizedPayload);
    }

    // gtag
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
    }

    // Plausible Analytics
    if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: payload });
    }

    // Dispatch DOM custom event for app-level listeners
    try {
        const customEvent = new CustomEvent('touchdine:conversion', {
            detail: sanitizedPayload,
        });
        window.dispatchEvent(customEvent);
    } catch {
        // Fallback for restricted environments
    }

    if (process.env.NODE_ENV === 'development') {
        console.debug('[Touch Dine Telemetry]', eventName, sanitizedPayload);
    }
}
