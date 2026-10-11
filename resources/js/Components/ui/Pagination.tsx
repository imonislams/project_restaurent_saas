import { Link } from '@inertiajs/react';

export interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

export default function Pagination({ links }: { links: PageLink[] }) {
    if (!links || links.length <= 3) return null;

    return (
        <nav className="mt-4 flex flex-wrap gap-1" aria-label="Pagination">
            {links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        preserveScroll
                        className={'rounded px-3 py-1 text-sm ' + (link.active ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100')}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={i} className="px-3 py-1 text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                ),
            )}
        </nav>
    );
}
