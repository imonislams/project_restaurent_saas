/**
 * Settings tabs in display order. `payments` and `demo` are full pages of their
 * own rather than field groups, so each gets its own href.
 */
export const SETTINGS_TABS = [
    'company',
    'branches',
    'team',
    'hours',
    'tax',
    'receipt',
    'billing',
    'pos',
    'orders',
    'notifications',
    'qr',
    'payments',
    'demo',
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function settingsTabHref(key: string): string {
    if (key === 'payments') {
        return route('settings.payments.index');
    }

    if (key === 'demo') {
        return route('settings.demo.index');
    }

    return route('settings.show', { group: key });
}
