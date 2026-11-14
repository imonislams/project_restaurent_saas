import { useState } from 'react';
import Button from '@/Components/ui/Button';
import { cn } from '@/Components/ui/cn';
import { marketingConfig, saveConsent, type ConsentCategory } from '@/lib/marketing';

const CATEGORY_LABEL: Record<ConsentCategory, string> = {
    essential: 'Essential',
    analytics: 'Analytics',
    advertising: 'Advertising',
};

const CATEGORY_HELP: Record<ConsentCategory, string> = {
    essential: 'Keeps you signed in and remembers your preferences. Always on.',
    analytics: 'Helps us understand how the site is used so we can improve it.',
    advertising: 'Lets us measure which campaigns brought you here.',
};

/**
 * The consent banner and its preference centre.
 *
 * Status is never carried by colour alone — each category states its own state in
 * words. All controls are real form controls with labels, so the whole thing is
 * keyboard operable and announced correctly.
 */
export default function ConsentBanner({ onDecided }: { onDecided: (granted: Record<ConsentCategory, boolean>) => void }) {
    const config = marketingConfig();
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [selection, setSelection] = useState<Record<ConsentCategory, boolean>>({
        essential: true,
        analytics: Boolean(config?.consent.granted.analytics),
        advertising: Boolean(config?.consent.granted.advertising),
    });

    if (!config || !config.consent.enabled) return null;

    const submit = async (categories: Record<ConsentCategory, boolean>, action: 'granted' | 'updated') => {
        setProcessing(true);
        const granted = await saveConsent(categories, action);
        setProcessing(false);

        if (granted) {
            onDecided(granted);
        }
    };

    const acceptAll = () => submit({ essential: true, analytics: true, advertising: true }, 'granted');
    const essentialOnly = () => submit({ essential: true, analytics: false, advertising: false }, 'updated');

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label="Cookie preferences"
            className="fixed inset-x-0 bottom-0 z-[80] border-t border-stone-200 bg-white/98 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur"
        >
            <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
                <p className="text-sm leading-relaxed text-stone-700">{config.consent.text}</p>

                {open && (
                    <ul className="mt-4 space-y-3 border-t border-stone-200 pt-4">
                        {(Object.keys(CATEGORY_LABEL) as ConsentCategory[]).map((category) => {
                            const locked = category === 'essential';

                            return (
                                <li key={category} className="flex items-start gap-3">
                                    <input
                                        id={`consent-${category}`}
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-stone-300 text-[#EC3013] focus-visible:ring-2 focus-visible:ring-[#EC3013] focus-visible:ring-offset-2"
                                        checked={locked ? true : selection[category]}
                                        disabled={locked}
                                        onChange={(event) =>
                                            setSelection((previous) => ({ ...previous, [category]: event.target.checked }))
                                        }
                                    />
                                    <div className="min-w-0">
                                        <label htmlFor={`consent-${category}`} className="block text-sm font-semibold text-stone-900">
                                            {CATEGORY_LABEL[category]}
                                            <span className="ml-2 text-xs font-normal text-stone-500">
                                                {locked ? '(always on)' : selection[category] ? '(allowed)' : '(not allowed)'}
                                            </span>
                                        </label>
                                        <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{CATEGORY_HELP[category]}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="primary" onClick={acceptAll} loading={processing}>
                        Accept all
                    </Button>

                    {open ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => submit(selection, 'updated')}
                            disabled={processing}
                        >
                            Save my choices
                        </Button>
                    ) : (
                        <Button type="button" size="sm" variant="secondary" onClick={essentialOnly} disabled={processing}>
                            Essential only
                        </Button>
                    )}

                    <button
                        type="button"
                        onClick={() => setOpen((previous) => !previous)}
                        aria-expanded={open}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013] focus-visible:ring-offset-2',
                        )}
                    >
                        {open ? 'Hide details' : 'Manage preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
}
