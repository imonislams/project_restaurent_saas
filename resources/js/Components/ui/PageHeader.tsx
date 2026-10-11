import { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

/**
 * Consistent page header: breadcrumb, title, description and primary actions.
 */
export default function PageHeader({
    title,
    description,
    breadcrumb,
    actions,
}: {
    title: ReactNode;
    description?: ReactNode;
    breadcrumb?: { label: string; href?: string }[];
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 && (
                    <nav className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
                        {breadcrumb.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                {i > 0 && <span className="text-gray-300">/</span>}
                                {crumb.href ? (
                                    <Link href={crumb.href} className="hover:text-gray-600">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span>{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
                {description && <p className="mt-1 max-w-3xl text-sm text-gray-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
