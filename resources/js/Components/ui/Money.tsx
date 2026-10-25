import { usePage } from '@inertiajs/react';

export function formatMoney(amount: number | string | null | undefined, currency = 'USD', locale = 'en'): string {
    const value = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
    if (!Number.isFinite(value)) return '—';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

export function formatNumber(value: number | string | null | undefined, locale = 'en'): string {
    const n = typeof value === 'string' ? Number(value) : (value ?? 0);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(value: string | null | undefined, locale = 'en'): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale = 'en'): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function Money({ amount, currency, locale = 'en', className }: { amount: number | string | null | undefined; currency?: string; locale?: string; className?: string }) {
    const sharedCurrency = (usePage().props as Record<string, any>)?.currency as string | undefined;
    return <span className={className}>{formatMoney(amount, currency ?? sharedCurrency ?? 'USD', locale)}</span>;
}
