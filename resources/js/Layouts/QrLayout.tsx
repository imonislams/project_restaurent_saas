import { ReactNode } from 'react';

/**
 * Full-screen, mobile-first shell for the app-less QR dining experience. No
 * tenant auth shell — restaurants branding only.
 */
export default function QrLayout({
    restaurant,
    tableName,
    headerRight,
    children,
}: {
    restaurant?: { name: string; branch: string } | null;
    tableName?: string | null;
    headerRight?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                            {restaurant?.name ?? 'Restaurant'}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                            {restaurant?.branch}
                            {tableName ? ` · Table ${tableName}` : ''}
                        </p>
                    </div>
                    {headerRight}
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
        </div>
    );
}
