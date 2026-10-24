import { Button } from '@/Components/ui';
import { cn } from '@/Components/ui/cn';
import { isOfflineStorageAvailable } from '@/offline/db';
import { flush, subscribe } from '@/offline/sync';
import type { SyncState } from '@/offline/types';
import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Connectivity + offline-queue status for the app-shell topbar. The engine itself
 * is booted by OfflineSyncBoot.
 *
 * Status is always carried by a label as well as a colour.
 */
export default function OfflineStatus() {
    const [state, setState] = useState<SyncState>({
        online: true,
        syncing: false,
        pending: 0,
        toReview: 0,
        lastSyncedAt: null,
        lastError: null,
    });

    useEffect(() => {
        if (!isOfflineStorageAvailable()) {
            return;
        }

        return subscribe(setState);
    }, []);

    if (!isOfflineStorageAvailable()) {
        return null;
    }

    const queued = state.pending;
    const offline = !state.online;

    if (!offline && !state.syncing && queued === 0 && state.toReview === 0 && !state.lastError) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11.5px] font-medium shadow-xs',
                offline
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-800'
                    : state.lastError
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/50 text-muted-foreground',
            )}
            title={state.lastError ?? undefined}
        >
            {offline ? (
                <CloudOff className="h-3.5 w-3.5 shrink-0" />
            ) : (
                <UploadCloud className="h-3.5 w-3.5 shrink-0" />
            )}

            <span className="whitespace-nowrap">
                {offline ? 'Offline' : state.syncing ? 'Syncing…' : 'Queued'}
                {queued > 0 ? ` · ${queued}` : ''}
            </span>

            {state.toReview > 0 && (
                <a
                    href={route('platform.offline-conflicts.index')}
                    className="whitespace-nowrap underline decoration-dotted hover:no-underline"
                    title="Operations the server resolved differently"
                >
                    {state.toReview} to review
                </a>
            )}

            {!offline && !state.syncing && queued > 0 && (
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => void flush()}>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sync now
                </Button>
            )}
        </div>
    );
}
