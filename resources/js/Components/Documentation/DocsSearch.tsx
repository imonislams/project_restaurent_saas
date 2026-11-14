import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowRight, BookOpen, FileText, Film, GitBranch, Search, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/Components/ui/Dialog';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import { searchDocs, type SearchEntry } from './content';

const TYPE_ICON: Record<SearchEntry['type'], typeof Search> = {
    Guide: BookOpen,
    Section: FileText,
    Button: Terminal,
    Journey: GitBranch,
    Video: Film,
};

const TYPE_TONE: Record<SearchEntry['type'], 'brand' | 'info' | 'neutral' | 'purple' | 'warning'> = {
    Guide: 'brand',
    Section: 'neutral',
    Button: 'info',
    Journey: 'purple',
    Video: 'warning',
};

export default function DocsSearch({
    open,
    onOpenChange,
    initialQuery = '',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialQuery?: string;
}) {
    const [query, setQuery] = useState(initialQuery);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [open]);

    useEffect(() => {
        if (open && initialQuery) {
            setQuery(initialQuery);
        }
    }, [open, initialQuery]);

    const results = useMemo(() => searchDocs(query, 16), [query]);

    const go = (entry: SearchEntry) => {
        onOpenChange(false);
        router.visit(entry.href);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-0 p-0">
                <DialogTitle className="sr-only">Search documentation</DialogTitle>
                <DialogDescription className="sr-only">
                    Search guides, sections, buttons, journeys and videos.
                </DialogDescription>

                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search guides, buttons, journeys or videos…"
                        className="h-7 w-full border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                        aria-label="Search documentation"
                    />
                    <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
                        Esc
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {query.trim().length < 2 && (
                        <div className="px-3 py-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Try searching for
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {['settle order', 'open shift', 'accept', 'QR code', 'void', 'branch access', 'roles'].map(
                                    (term) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => setQuery(term)}
                                            className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                                        >
                                            {term}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {query.trim().length >= 2 && results.length === 0 && (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No documentation matches “{query}”.
                        </p>
                    )}

                    <ul className="space-y-0.5">
                        {results.map((entry) => {
                            const Icon = TYPE_ICON[entry.type];
                            return (
                                <li key={entry.id}>
                                    <button
                                        type="button"
                                        onClick={() => go(entry)}
                                        className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                                    >
                                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-background">
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-medium text-foreground">
                                                    {entry.title}
                                                </span>
                                                <Badge tone={TYPE_TONE[entry.type]} dot={false} className="text-[9px]">
                                                    {entry.type}
                                                </Badge>
                                            </span>
                                            <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                                                {entry.subtitle}
                                            </span>
                                        </span>
                                        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className={cn('flex items-center justify-between border-t border-border px-4 py-2')}>
                    <p className="text-[10px] text-muted-foreground">
                        Searches guide titles, sections, button names, journeys and recorded videos.
                    </p>
                    <p className="hidden text-[10px] text-muted-foreground sm:block">{results.length} results</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
