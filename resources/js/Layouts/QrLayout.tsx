import { DEFAULT_BRANDING, QrBranding, brandingCssVars, contrastText } from '@/Components/Qr/qrBranding';
import { CSSProperties, ReactNode } from 'react';

/**
 * Full-screen, mobile-first shell for the app-less QR dining experience. No
 * tenant auth shell — restaurant branding only.
 *
 * The restaurant's QR menu colours drive the theme through CSS variables
 * (`--qr-primary` etc.), so a tenant that never customises branding keeps the
 * default look. Everything here is display-only; the server never trusts these
 * values for authorization.
 */
export default function QrLayout({
    restaurant,
    tableName,
    branding,
    headerRight,
    children,
}: {
    restaurant?: { name: string; branch: string; logo_url?: string | null } | null;
    tableName?: string | null;
    branding?: Partial<QrBranding> | null;
    headerRight?: ReactNode;
    children: ReactNode;
}) {
    const theme: QrBranding = { ...DEFAULT_BRANDING, ...(branding ?? {}) };

    const headerBg = theme.header_style === 'brand'
        ? theme.primary_color
        : theme.header_style === 'dark'
            ? theme.accent_color
            : '#ffffff';
    const headerText = theme.header_style === 'light' ? theme.accent_color : contrastText(headerBg);
    const showTable = theme.show_table_name && Boolean(tableName);

    return (
        <div
            className="min-h-screen"
            style={{ ...(brandingCssVars(theme) as CSSProperties), background: theme.background_color, color: theme.accent_color }}
        >
            <header className="sticky top-0 z-30 border-b border-black/5 backdrop-blur" style={{ background: headerBg }}>
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {theme.show_logo && restaurant?.logo_url && (
                            <img src={restaurant.logo_url} alt={restaurant.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold" style={{ color: headerText }}>
                                {restaurant?.name ?? 'Restaurant'}
                            </p>
                            <p className="truncate text-xs" style={{ color: headerText, opacity: 0.75 }}>
                                {restaurant?.branch}
                                {showTable ? ` · Table ${tableName}` : ''}
                            </p>
                        </div>
                    </div>
                    {headerRight}
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-4">
                {(theme.welcome_title || theme.welcome_text) && (
                    <div
                        className="mb-4 rounded-xl px-4 py-3"
                        style={{
                            background: `${theme.primary_color}14`,
                            borderLeft: `3px solid ${theme.primary_color}`,
                        }}
                    >
                        {theme.welcome_title && (
                            <p className="text-sm font-bold" style={{ color: theme.accent_color }}>{theme.welcome_title}</p>
                        )}
                        {theme.welcome_text && (
                            <p className="mt-0.5 text-xs" style={{ color: theme.accent_color, opacity: 0.75 }}>{theme.welcome_text}</p>
                        )}
                    </div>
                )}

                {children}
            </main>

            {theme.footer_text && (
                <footer className="mx-auto max-w-2xl px-4 pb-8 pt-2 text-center text-xs" style={{ color: theme.accent_color, opacity: 0.55 }}>
                    {theme.footer_text}
                </footer>
            )}
        </div>
    );
}
