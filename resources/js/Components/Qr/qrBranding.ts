/**
 * Client-side mirror of the server's QR branding defaults and contrast rule, so
 * the designer's live preview matches what the public QR pages will render.
 */

export interface QrBranding {
    primary_color: string;
    accent_color: string;
    background_color: string;
    header_style: 'light' | 'brand' | 'dark';
    show_logo: boolean;
    show_table_name: boolean;
    welcome_title: string;
    welcome_text: string;
    footer_text: string;
}

export const DEFAULT_BRANDING: QrBranding = {
    primary_color: '#ec3013',
    accent_color: '#0f172a',
    background_color: '#f8fafc',
    header_style: 'light',
    show_logo: true,
    show_table_name: true,
    welcome_title: '',
    welcome_text: '',
    footer_text: '',
};

/** Readable text colour (near-black or white) for a background colour. */
export function contrastText(hex: string): string {
    const value = hex.replace('#', '');
    const normalized = value.length === 3
        ? `${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`
        : value;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#ffffff';

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

export function brandingCssVars(branding: QrBranding): Record<string, string> {
    return {
        '--qr-primary': branding.primary_color,
        '--qr-primary-text': contrastText(branding.primary_color),
        '--qr-accent': branding.accent_color,
        '--qr-background': branding.background_color,
    };
}
