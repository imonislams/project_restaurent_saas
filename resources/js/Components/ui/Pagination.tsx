import { Link } from '@inertiajs/react';
import { useT } from '@/i18n';
import { cn } from './cn';

export interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationProps {
    links: PageLink[];
    className?: string;
    /** First visible record on the current page (enables the summary footer when `total` is set). */
    from?: number | null;
    /** Last visible record on the current page. */
    to?: number | null;
    total?: number;
    perPage?: string | number;
    perPageOptions?: number[];
    onPerPageChange?: (value: string) => void;
}

export default function Pagination({
    links,
    className,
    from,
    to,
    total,
    perPage,
    perPageOptions = [10, 20, 50, 100],
    onPerPageChange,
}: PaginationProps) {
    const t = useT();

    const linkNodes = links?.map((link, i) =>
        link.url ? (
            <Link
                key={i}
                href={link.url}
                preserveScroll
                className={cn(
                    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer',
                    link.active
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-input bg-background text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                )}
                dangerouslySetInnerHTML={{ __html: link.label }}
            />
        ) : (
            <span
                key={i}
                className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-transparent px-2.5 text-xs text-muted-foreground/50 select-none"
                dangerouslySetInnerHTML={{ __html: link.label }}
            />
        ),
    );

    // Legacy paginator: no summary/per-page props supplied.
    if (total === undefined) {
        if (!links || links.length <= 3) return null;

        return (
            <nav className={cn('flex flex-wrap items-center gap-1.5 pt-4 print:hidden', className)} aria-label="Pagination">
                {linkNodes}
            </nav>
        );
    }

    if (total === 0) return null;

    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3 print:hidden', className)}>
            <span className="text-xs text-muted-foreground">
                {t('common.pagination.showing', { from: from ?? 0, to: to ?? 0, count: total })}
            </span>

            <div className="flex flex-wrap items-center gap-3">
                {links && links.length > 3 && (
                    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Pagination">
                        {linkNodes}
                    </nav>
                )}

                {onPerPageChange && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t('common.pagination.perPage')}</span>
                        <select
                            value={String(perPage ?? '')}
                            onChange={(event) => onPerPageChange(event.target.value)}
                            aria-label={t('common.pagination.perPage')}
                            className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 pr-7 text-xs text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {perPageOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
        </div>
    );
}
