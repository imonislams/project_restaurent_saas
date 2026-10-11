/**
 * Currency symbols and formatting utilities synchronized with platform settings.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    BDT: '৳',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    AED: 'AED ',
    SGD: 'S$',
    CAD: 'CA$',
    AUD: 'A$',
    JPY: '¥',
};

/**
 * Returns the human-readable symbol for a given 3-letter currency code.
 */
export function getCurrencySymbol(currency?: string | null): string {
    if (!currency) return '$';
    const code = currency.toUpperCase().trim();
    return CURRENCY_SYMBOLS[code] || `${code} `;
}

/**
 * Formats a numeric price into a currency string (e.g., $29, ৳29, €29).
 */
export function formatPrice(amount: number, currency?: string | null): string {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toLocaleString()}`;
}
