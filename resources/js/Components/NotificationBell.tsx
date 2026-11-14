import { Link, router } from '@inertiajs/react';
import { Bell, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Item {
    id: string;
    title: string;
    body: string | null;
    level: string;
    url: string | null;
    read: boolean;
    created_at: string | null;
}

const DOT: Record<string, string> = {
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-primary',
};

function ago(iso: string | null): string {
    if (!iso) return '';
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / 1440)}d ago`;
}

/** Header bell: unread badge plus a small popover of the latest notifications. */
export default function NotificationBell({
    unread,
    indexUrl,
    recentUrl,
    readAllUrl,
    destroyUrl,
    className = '',
}: {
    unread: number;
    indexUrl: string;
    recentUrl: string;
    readAllUrl: string;
    /** Route URL template; `:id` is replaced with the notification id. */
    destroyUrl: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Item[] | null>(null);
    const [failed, setFailed] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        setFailed(false);
        fetch(recentUrl, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((json) => setItems(json.items))
            .catch(() => setFailed(true));

        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, recentUrl]);

    const markAll = () => {
        router.post(readAllUrl, {}, { preserveScroll: true, preserveState: true });
        setItems((prev) => prev?.map((i) => ({ ...i, read: true })) ?? prev);
    };

    const remove = (id: string) => {
        router.delete(destroyUrl.replace(':id', id), { preserveScroll: true, preserveState: true });
        setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    };

    return (
        <div ref={wrapRef} className={'relative ' + className}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                className="relative flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-xs">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                        <span className="text-sm font-semibold">Notifications</span>
                        {unread > 0 && (
                            <button type="button" onClick={markAll} className="text-[13px] font-medium text-primary hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {failed && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">Could not load notifications.</p>}
                        {!failed && items === null && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">Loading…</p>}
                        {!failed && items?.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">You are all caught up.</p>}
                        {items?.map((n) => {
                            const content = (
                                <div className="flex gap-2.5">
                                    <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (n.read ? 'bg-transparent' : (DOT[n.level] ?? DOT.info))} />
                                    <div className="min-w-0 flex-1">
                                        <div className={'truncate text-sm ' + (n.read ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{n.title}</div>
                                        {n.body && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{n.body}</p>}
                                        <div className="mt-0.5 text-[13px] text-muted-foreground/80">{ago(n.created_at)}</div>
                                    </div>
                                </div>
                            );
                            const cls = 'block min-w-0 flex-1 px-3 py-2.5';
                            return (
                                <div key={n.id} className="group flex items-start border-b border-border/60 last:border-b-0 hover:bg-accent/50">
                                    {n.url ? (
                                        <a href={n.url} className={cls}>
                                            {content}
                                        </a>
                                    ) : (
                                        <div className={cls}>{content}</div>
                                    )}
                                    <button
                                        type="button"
                                        aria-label="Delete notification"
                                        title="Delete"
                                        onClick={() => remove(n.id)}
                                        className="mr-2 mt-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <Link href={indexUrl} className="block border-t border-border px-3 py-2 text-center text-[13px] font-semibold text-primary hover:bg-accent/50" onClick={() => setOpen(false)}>
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
