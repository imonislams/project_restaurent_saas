import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import DocsSearch from './DocsSearch';
import { DOC_NAV, adjacentDocs, docHref, docsHome, findDoc } from './content';
import type { DocGuide } from './types';

export interface TocItem {
    id: string;
    title: string;
}

interface DocsLayoutProps {
    currentSlug?: string;
    breadcrumb?: { label: string; href?: string }[];
    toc?: TocItem[];
    actions?: ReactNode;
    children: ReactNode;
    /** Show previous/next even on the homepage (defaults to true). */
    showPager?: boolean;
    /** Use the full content width for screenshot-heavy pages. */
    wide?: boolean;
}

function NavList({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
    return (
        <nav className="space-y-4" aria-label="Documentation">
            {DOC_NAV.map((section) => (
                <div key={section.group.id}>
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {section.group.label}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                        {section.items.map((doc) => {
                            const active = doc.slug === currentSlug;
                            return (
                                <li key={doc.slug}>
                                    <Link
                                        href={docHref(doc.slug)}
                                        onClick={onNavigate}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] leading-snug transition-colors',
                                            active
                                                ? 'bg-primary/10 font-semibold text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <span
                                            className={cn(
                                                'h-1 w-1 shrink-0 rounded-full',
                                                active ? 'bg-primary' : 'bg-border'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{doc.title}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export default function DocsLayout({
    currentSlug,
    breadcrumb,
    toc,
    actions,
    children,
    showPager = true,
    wide = false,
}: DocsLayoutProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const page = usePage();
    const current = currentSlug ? findDoc(currentSlug) : undefined;
    const { prev, next } = useMemo(
        () => (currentSlug && showPager ? adjacentDocs(currentSlug) : {}),
        [currentSlug, showPager]
    );

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash) {
            return;
        }
        const timer = window.setTimeout(() => {
            const target = document.getElementById(decodeURIComponent(hash.slice(1)));
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 90);
        return () => window.clearTimeout(timer);
    }, [page.url]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing =
                target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !typing) {
                event.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const crumbs = breadcrumb ?? [];

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-[1440px] px-3 pb-12 pt-4 sm:px-5 lg:px-6">
                <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <li>
                                <Link href={docsHome()} className="font-medium text-muted-foreground hover:text-foreground">
                                    Documentation
                                </Link>
                            </li>
                            {crumbs.map((crumb, index) => (
                                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
                                    {crumb.href && index < crumbs.length - 1 ? (
                                        <Link href={crumb.href} className="font-medium text-muted-foreground hover:text-foreground">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold text-foreground/80">{crumb.label}</span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="inline-flex h-8 flex-1 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-accent sm:w-56"
                        >
                            <Search className="h-3.5 w-3.5" />
                            <span className="truncate">Search documentation…</span>
                            <kbd className="ml-auto hidden rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-medium sm:block">
                                ⌘K
                            </kbd>
                        </button>
                        {actions}
                    </div>
                </div>

                <div
                    className={cn(
                        'grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]',
                        !wide && 'xl:grid-cols-[230px_minmax(0,1fr)_190px]'
                    )}
                >
                    <aside className="hidden lg:block">
                        <div className="sticky top-[60px] max-h-[calc(100vh-72px)] overflow-y-auto pr-1">
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <div className="min-w-0">
                                    <p className="truncate text-[11px] font-semibold text-foreground">
                                        Learning centre
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Live captures · verified labels</p>
                                </div>
                            </div>
                            <NavList currentSlug={currentSlug} />
                        </div>
                    </aside>

                    <div className="min-w-0">
                        <div className="mb-4 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen((value) => !value)}
                                aria-expanded={mobileNavOpen}
                                className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                    Browse documentation
                                </span>
                                <ChevronDown
                                    className={cn('h-4 w-4 transition-transform', mobileNavOpen && 'rotate-180')}
                                />
                            </button>
                            {mobileNavOpen && (
                                <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card p-2">
                                    <NavList currentSlug={currentSlug} onNavigate={() => setMobileNavOpen(false)} />
                                </div>
                            )}
                        </div>

                        {wide && toc && toc.length > 0 && (
                            <div className="mb-4 rounded-lg border border-border bg-card px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    On this page
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {toc.map((item) => (
                                        <a
                                            key={item.id}
                                            href={`#${item.id}`}
                                            className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                        >
                                            {item.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {children}

                        {showPager && (prev || next) && (
                            <nav className="mt-8 grid gap-2 border-t border-border/70 pt-4 sm:grid-cols-2" aria-label="Guide pagination">
                                {prev ? (
                                    <Link
                                        href={docHref(prev.slug)}
                                        className="group flex flex-col rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
                                    >
                                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            <ChevronLeft className="h-3 w-3" /> Previous
                                        </span>
                                        <span className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary">
                                            {prev.title}
                                        </span>
                                    </Link>
                                ) : (
                                    <span className="hidden sm:block" />
                                )}
                                {next && (
                                    <Link
                                        href={docHref(next.slug)}
                                        className="group flex flex-col items-end rounded-lg border border-border bg-card px-3 py-2.5 text-right transition-colors hover:border-primary/40"
                                    >
                                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Next <ChevronRight className="h-3 w-3" />
                                        </span>
                                        <span className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary">
                                            {next.title}
                                        </span>
                                    </Link>
                                )}
                            </nav>
                        )}
                    </div>

                    <aside className={cn('hidden xl:block', wide && 'xl:hidden')}>
                        <div className="sticky top-[60px] max-h-[calc(100vh-72px)] overflow-y-auto pl-1">
                            {toc && toc.length > 0 ? (
                                <>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        On this page
                                    </p>
                                    <ul className="space-y-0.5 border-l border-border">
                                        {toc.map((item) => (
                                            <li key={item.id}>
                                                <a
                                                    href={`#${item.id}`}
                                                    className="-ml-px block border-l border-transparent py-1 pl-2.5 text-[11.5px] leading-snug text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                                                >
                                                    {item.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : null}

                            {current?.related && current.related.length > 0 && (
                                <div className="mt-5 border-t border-border/70 pt-3">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Related
                                    </p>
                                    <ul className="space-y-1">
                                        {current.related.map((slug) => {
                                            const related = findDoc(slug);
                                            if (!related) {
                                                return null;
                                            }
                                            return (
                                                <li key={slug}>
                                                    <Link
                                                        href={docHref(slug)}
                                                        className="block text-[11.5px] leading-snug text-muted-foreground hover:text-primary"
                                                    >
                                                        {related.title}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
    );
}

export function DocMeta({ guide }: { guide: DocGuide }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" dot={false}>
                Verified guide
            </Badge>
            {guide.permission && (
                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {guide.permission}
                </code>
            )}
            {guide.readMinutes && (
                <span className="text-[11px] text-muted-foreground">{guide.readMinutes} min read</span>
            )}
        </div>
    );
}
