import ConsentBanner from '@/Components/Marketing/ConsentBanner';
import TrackingScripts from '@/Components/Marketing/TrackingScripts';
import { configureMarketing, type ConsentCategory, type MarketingPublicConfig } from '@/lib/marketing';
import { usePage } from '@inertiajs/react';
import { PropsWithChildren, useState } from 'react';

/**
 * Wires the shared marketing configuration into the client, loads the consent-gated
 * tags, and shows the consent prompt until the visitor has made a choice.
 *
 * Mounted by MarketingLayout, so it exists on the public site only — the platform
 * and tenant workspaces neither prompt nor track.
 */
export default function MarketingConsentProvider({ children }: PropsWithChildren) {
    const config = (usePage().props as { marketing?: MarketingPublicConfig }).marketing;

    const [granted, setGranted] = useState<Record<ConsentCategory, boolean> | null>(
        config?.consent.granted ?? null,
    );
    const [decided, setDecided] = useState<boolean>(config?.consent.recorded ?? true);

    // Configured during render rather than in an effect: children — including
    // TrackingScripts — render in the same pass and must already see the effective
    // consent, otherwise a tag could load before its category was granted.
    if (config) {
        configureMarketing({
            ...config,
            consent: {
                ...config.consent,
                granted: granted ?? config.consent.granted,
                recorded: decided,
            },
        });
    }

    // Remount the tag loader when consent changes, so newly-permitted tags load.
    // Already-loaded scripts are skipped by their DOM id.
    const signature = `${Boolean(granted?.analytics)}-${Boolean(granted?.advertising)}`;

    return (
        <>
            <TrackingScripts key={signature} />
            {children}
            {!decided && (
                <ConsentBanner
                    onDecided={(next) => {
                        setGranted(next);
                        setDecided(true);
                    }}
                />
            )}
        </>
    );
}
