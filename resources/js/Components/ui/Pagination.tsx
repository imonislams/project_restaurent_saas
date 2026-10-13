import { Link } from '@inertiajs/react';
import { cn } from './cn';

export interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

export default function Pagination({ links, className }: { links: PageLink[]; className?: string }) {
    if (!links || links.length <= 3) return null;

    return (
        <nav className={cn('flex flex-wrap items-center gap-1.5 pt-4', className)} aria-label="Pagination">
            {links.map((link, i) =>
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
            )}
        </nav>
    );
}
