import { Button } from '@/Components/ui';
import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'touchdine.pwa.install-dismissed';

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

/**
 * Suggests installing the app once the browser offers it. iOS never fires
 * `beforeinstallprompt`, so there we show the manual Share → Add to Home Screen
 * instructions instead of pretending there is an install button.
 */
export default function PwaInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [iosHint, setIosHint] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(DISMISS_KEY) === '1' || isStandalone()) {
            return;
        }

        const ua = window.navigator.userAgent;
        const isIos = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);

        const onBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
            setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);

        if (isIos) {
            setIosHint(true);
            setVisible(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }, []);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
    };

    const install = async () => {
        if (!deferred) {
            return;
        }

        await deferred.prompt();
        await deferred.userChoice;

        setDeferred(null);
        dismiss();
    };

    if (!visible) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-elevated"
        >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {iosHint ? <Share className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            </span>

            <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Install Touch Dine</p>

                {iosHint ? (
                    <p className="text-xs text-muted-foreground">
                        Tap <Share className="inline h-3 w-3 align-text-bottom" /> Share, then{' '}
                        <span className="font-medium text-foreground">Add to Home Screen</span>.
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Add it to your device for a full-screen, app-like experience.
                    </p>
                )}

                <div className="flex gap-2 pt-0.5">
                    {!iosHint && (
                        <Button size="sm" onClick={install}>
                            Install
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={dismiss}>
                        {iosHint ? 'Got it' : 'Not now'}
                    </Button>
                </div>
            </div>

            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss install suggestion"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
