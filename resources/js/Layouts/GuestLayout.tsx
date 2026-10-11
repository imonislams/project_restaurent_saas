import ApplicationLogo from '@/Components/ApplicationLogo';
import { useT } from '@/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    const page = usePage().props as Record<string, any>;
    const locale = page.locale ?? 'en';
    const locales: { value: string; label: string }[] = page.locales ?? [];
    const t = useT();

    return (
        <div className="relative flex min-h-screen flex-col items-center bg-gray-100 pt-6 sm:justify-center sm:pt-0">
            {locales.length > 1 && (
                <div className="absolute right-6 top-6">
                    <select
                        value={locale}
                        onChange={(e) => router.post(route('locale.update'), { locale: e.target.value })}
                        className="rounded-md border-gray-300 py-1 text-sm text-gray-600"
                        aria-label={t('shell.language')}
                    >
                        {locales.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" />
                </Link>
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}
