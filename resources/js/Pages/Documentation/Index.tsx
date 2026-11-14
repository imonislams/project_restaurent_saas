import { useMemo, useState } from 'react';
import { Link, router, Head } from '@inertiajs/react';
import Icon, { IconName } from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import { cn } from '@/Components/ui/cn';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock,
    ExternalLink,
    Film,
    GitBranch,
    LifeBuoy,
    Search,
    Sparkles,
    Terminal,
} from 'lucide-react';
import DocsLayout from '@/Components/Documentation/DocsLayout';
import DocsSearch from '@/Components/Documentation/DocsSearch';
import DocsShell from '@/Components/Documentation/DocsShell';
import VideoLibrary from '@/Components/Documentation/VideoLibrary';
import {
    ANNOTATED_SCREENS,
    DOC_NAV,
    FLAT_DOCS,
    GUIDES,
    JOURNEYS,
    POPULAR_DOCS,
    SEARCH_INDEX,
    VIDEOS,
    docHref,
    docsHome,
    searchDocs,
} from '@/Components/Documentation/content';

const GROUP_ICON: Record<string, IconName> = {
    start: 'book',
    operations: 'cart',
    catalog: 'tag',
    team: 'users',
    stock: 'cube',
    money: 'wallet',
    configure: 'sliders',
    learn: 'activity',
};

const QUICK_START = ['getting-started', 'restaurant-setup', 'orders', 'roles-permissions'];
const RECENT = ['orders', 'pos-checkout', 'kitchen-display', 'journeys'];

export default function DocumentationIndex() {
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');

    const results = useMemo(() => searchDocs(query, 6), [query]);

    const written = GUIDES.length;
    const annotated = Object.keys(ANNOTATED_SCREENS).length;

    const go = (href: string) => {
        setSearchOpen(false);
        router.visit(href);
    };

    return (
        <DocsShell>
            <Head title="Documentation" />
            <DocsLayout showPager={false}>
                <div className="space-y-8 pb-6">
                    {/* Hero */}
                    <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.07] via-background to-background px-4 py-6 shadow-sm sm:px-6 sm:py-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral" dot={false}>
                                {FLAT_DOCS.length} documentation pages
                            </Badge>
                            <Badge tone="success" dot={false}>
                                {written} verified guides
                            </Badge>
                            <Badge tone="brand" dot={false}>
                                {annotated} annotated screens
                            </Badge>
                        </div>

                        <h1 className="mt-3 max-w-3xl font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
                            Learn Touch Dine from first login to a reconciled till
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            Screenshot walkthroughs, button-by-button reference, complete user journeys and
                            role-based guides — written against the application as it actually behaves.
                        </p>

                        <div className="mt-4 max-w-2xl">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && results[0]) {
                                            go(results[0].href);
                                        }
                                    }}
                                    placeholder="Search a module, button, workflow or role…"
                                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-label="Search documentation"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex"
                                >
                                    <Search className="h-2.5 w-2.5" /> Advanced
                                </button>
                            </div>

                            {query.trim().length >= 2 && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                                    {results.length === 0 ? (
                                        <p className="px-3 py-3 text-xs text-muted-foreground">
                                            No documentation matches “{query}”.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-border/60">
                                            {results.map((entry) => (
                                                <li key={entry.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => go(entry.href)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                                                    >
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            {entry.type}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                                                            {entry.title}
                                                        </span>
                                                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Try
                                </span>
                                {['settle order', 'open shift', 'accept', 'QR code', 'branch access'].map((term) => (
                                    <button
                                        key={term}
                                        type="button"
                                        onClick={() => setQuery(term)}
                                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                            {[
                                { icon: BookOpen, value: `${FLAT_DOCS.length}`, label: 'pages across 8 sections' },
                                { icon: GitBranch, value: `${JOURNEYS.length}`, label: 'complete user journeys' },
                                { icon: Film, value: `${VIDEOS.length}`, label: 'recorded video walkthroughs' },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card/80 px-3 py-2"
                                >
                                    <stat.icon className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold leading-none text-foreground">{stat.value}</p>
                                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Scope */}
                    <section className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30">
                        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-sky-900 dark:text-sky-100">
                            <Badge tone="info" dot={false}>
                                Documented from the running app
                            </Badge>
                            Every screenshot is a live capture, not a mockup
                        </p>
                        <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-sky-900/80 dark:text-sky-100/80">
                            Pages, button labels, routes and permission slugs were verified against the application.
                            Eight screens carry numbered, clickable annotations, the rest include the same live screen
                            without markers, and the video section plays recorded walkthroughs of the live app.
                        </p>
                    </section>

                    {/* Getting started */}
                    <section aria-labelledby="getting-started">
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                                <h2 id="getting-started" className="text-lg font-semibold tracking-tight text-foreground">
                                    Getting started
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    The shortest path from a new workspace to the first sale.
                                </p>
                            </div>
                            <Link
                                href={docHref('getting-started')}
                                className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:flex"
                            >
                                Start here <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {QUICK_START.map((slug) => {
                                const guide = GUIDES.find((item) => item.slug === slug);
                                if (!guide) {
                                    return null;
                                }
                                return (
                                    <Link
                                        key={slug}
                                        href={docHref(slug)}
                                        className="group flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-primary/40"
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon name={guide.icon} className="h-4 w-4" />
                                        </span>
                                        <span className="mt-2 text-sm font-semibold text-foreground group-hover:text-primary">
                                            {guide.title}
                                        </span>
                                        <span className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-muted-foreground">
                                            {guide.summary}
                                        </span>
                                        <span className="mt-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                            {guide.readMinutes ? (
                                                <>
                                                    <Clock className="h-3 w-3" /> {guide.readMinutes} min
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" /> Verified guide
                                                </>
                                            )}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    {/* Modules */}
                    <section aria-labelledby="modules">
                        <div className="mb-3">
                            <h2 id="modules" className="text-lg font-semibold tracking-tight text-foreground">
                                Browse by module
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Every module that exists in this build, grouped the same way as the sidebar.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {DOC_NAV.map((section) => (
                                <div
                                    key={section.group.id}
                                    className="rounded-xl border border-border bg-card p-3.5 shadow-sm"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
                                            <Icon name={GROUP_ICON[section.group.id] ?? 'book'} className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    {section.group.label}
                                                </h3>
                                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">
                                                    {section.items.length}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {section.group.description}
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="mt-2.5 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                                        {section.items.map((doc) => (
                                            <li key={doc.slug}>
                                                <Link
                                                    href={docHref(doc.slug)}
                                                    className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-primary"
                                                >
                                                    <span
                                                        className={cn(
                                                            'h-1 w-1 shrink-0 rounded-full',
                                                            'bg-primary/70'
                                                        )}
                                                    />
                                                    <span className="truncate">{doc.title}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Videos */}
                    <section aria-labelledby="videos">
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                                <h2 id="videos" className="text-lg font-semibold tracking-tight text-foreground">
                                    Video tutorials
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Recorded walkthroughs of the live application, with chapters and fullscreen.
                                </p>
                            </div>
                            <Link
                                href={docHref('videos')}
                                className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:flex"
                            >
                                All videos <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <VideoLibrary limit={3} />
                    </section>

                    {/* Popular */}
                    <section aria-labelledby="popular">
                        <div className="mb-3">
                            <h2 id="popular" className="text-lg font-semibold tracking-tight text-foreground">
                                Popular guides
                            </h2>
                            <p className="text-xs text-muted-foreground">The pages teams open most often.</p>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                            {POPULAR_DOCS.map((guide) => (
                                <Link
                                    key={guide.slug}
                                    href={docHref(guide.slug)}
                                    className="group flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-xs transition-colors hover:border-primary/40"
                                >
                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70">
                                        <Icon name={guide.icon} className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold text-foreground group-hover:text-primary">
                                            {guide.title}
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                                            {guide.summary}
                                        </span>
                                    </span>
                                    <ArrowRight className="mt-1 ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Journeys */}
                    <section aria-labelledby="journeys">
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                                <h2 id="journeys" className="text-lg font-semibold tracking-tight text-foreground">
                                    Complete user journeys
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Workflows with decision points, from the first click to the final receipt.
                                </p>
                            </div>
                            <Link
                                href={docHref('journeys')}
                                className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:flex"
                            >
                                Open journeys <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            {JOURNEYS.map((journey) => (
                                <a
                                    key={journey.id}
                                    href={`${docHref('journeys')}#${journey.id}`}
                                    className="group flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-primary/40"
                                >
                                    <span className="flex items-center gap-2">
                                        <GitBranch className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {journey.steps.length} stages
                                        </span>
                                    </span>
                                    <span className="mt-2 text-sm font-semibold text-foreground group-hover:text-primary">
                                        {journey.title}
                                    </span>
                                    <span className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                                        {journey.summary}
                                    </span>
                                    <span className="mt-2 text-[10px] text-muted-foreground">{journey.audience}</span>
                                </a>
                            ))}
                        </div>
                    </section>

                    {/* Recent + helpful links */}
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <section aria-labelledby="recent">
                            <div className="mb-3">
                                <h2 id="recent" className="text-lg font-semibold tracking-tight text-foreground">
                                    Recently added
                                </h2>
                                <p className="text-xs text-muted-foreground">Newest material in this demo build.</p>
                            </div>
                            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                                {RECENT.map((slug) => {
                                    const guide = GUIDES.find((item) => item.slug === slug);
                                    if (!guide) {
                                        return null;
                                    }
                                    return (
                                        <li key={slug}>
                                            <Link
                                                href={docHref(slug)}
                                                className="group flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50"
                                            >
                                                <Icon name={guide.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-semibold text-foreground group-hover:text-primary">
                                                        {guide.title}
                                                    </span>
                                                    <span className="block truncate text-[10.5px] text-muted-foreground">
                                                        {guide.summary}
                                                    </span>
                                                </span>
                                                <Badge tone="neutral" dot={false} className="shrink-0 text-[9px]">
                                                    Demo
                                                </Badge>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        <section aria-labelledby="helpful">
                            <div className="mb-3">
                                <h2 id="helpful" className="text-lg font-semibold tracking-tight text-foreground">
                                    Helpful links
                                </h2>
                                <p className="text-xs text-muted-foreground">Jump straight to a reference.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Link
                                    href={docHref('button-reference')}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:border-primary/40 hover:text-primary"
                                >
                                    <Terminal className="h-3.5 w-3.5" /> Button reference
                                    <ArrowRight className="ml-auto h-3 w-3" />
                                </Link>
                                <Link
                                    href={docHref('role-guides')}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:border-primary/40 hover:text-primary"
                                >
                                    <Sparkles className="h-3.5 w-3.5" /> Role-based guides
                                    <ArrowRight className="ml-auto h-3 w-3" />
                                </Link>
                                <Link
                                    href={docHref('troubleshooting')}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:border-primary/40 hover:text-primary"
                                >
                                    <LifeBuoy className="h-3.5 w-3.5" /> Troubleshooting
                                    <ArrowRight className="ml-auto h-3 w-3" />
                                </Link>
                                <a
                                    href={typeof route !== 'undefined' ? route('help') : '/help'}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:border-primary/40 hover:text-primary"
                                >
                                    <LifeBuoy className="h-3.5 w-3.5" /> Help Center
                                    <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                                </a>
                                <a
                                    href={typeof route !== 'undefined' ? route('resources.index') : '/resources'}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs hover:border-primary/40 hover:text-primary"
                                >
                                    <BookOpen className="h-3.5 w-3.5" /> Operator guides
                                    <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                                </a>
                            </div>
                        </section>
                    </div>

                    <p className="text-center text-[10.5px] text-muted-foreground">
                        {FLAT_DOCS.length} pages · {SEARCH_INDEX.length} searchable entries ·{' '}
                        <a href={docsHome()} className="font-medium text-primary hover:underline">
                            Documentation home
                        </a>
                    </p>
                </div>
            </DocsLayout>

            <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} initialQuery={query} />
        </DocsShell>
    );
}
