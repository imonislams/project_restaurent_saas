import { Button } from '@/Components/ui';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Prompts the user when the service worker has a newer version of the app ready.
 * We do not auto-reload: reloading mid-transaction (e.g. a sale) would be hostile.
 */
export default function PwaUpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    if (!needRefresh) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-elevated"
        >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <RefreshCw className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">A new version is available</p>
                <p className="text-xs text-muted-foreground">Reload to update Touch Dine.</p>
                <div className="flex gap-2 pt-0.5">
                    <Button size="sm" onClick={() => updateServiceWorker(true)}>
                        Reload
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
                        Later
                    </Button>
                </div>
            </div>

            <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                aria-label="Dismiss update notice"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
