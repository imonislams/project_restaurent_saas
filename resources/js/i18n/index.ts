import { translations } from '@/i18n/translations';
import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Translate a key for a given locale, interpolating `:placeholders`.
 * Falls back to English, then to the raw key.
 */
export function translate(locale: string, key: string, params?: Record<string, string | number>): string {
    let value = translations[locale]?.[key] ?? translations.en[key] ?? key;

    if (params) {
        for (const [name, replacement] of Object.entries(params)) {
            value = value.replace(`:${name}`, String(replacement));
        }
    }

    return value;
}

/** React hook: `const t = useT();` then `t('nav.pos')`. */
export function useT(): Translate {
    const locale = ((usePage().props as Record<string, any>).locale ?? 'en') as string;

    return useCallback((key: string, params?: Record<string, string | number>) => translate(locale, key, params), [locale]);
}
