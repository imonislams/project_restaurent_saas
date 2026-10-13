import { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/Components/ui/breadcrumb';
import { cn } from './cn';

export interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    breadcrumb?: { label: string; href?: string }[];
    actions?: ReactNode;
    className?: string;
}

export default function PageHeader({
    title,
    description,
    breadcrumb,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
            <div className="min-w-0 space-y-1">
                {breadcrumb && breadcrumb.length > 0 && (
                    <Breadcrumb className="mb-1.5">
                        <BreadcrumbList className="text-xs text-muted-foreground">
                            {breadcrumb.map((crumb, i) => {
                                const isLast = i === breadcrumb.length - 1;
                                return (
                                    <span key={i} className="inline-flex items-center gap-1.5">
                                        <BreadcrumbItem>
                                            {crumb.href && !isLast ? (
                                                <BreadcrumbLink asChild>
                                                    <Link href={crumb.href} className="font-medium hover:text-foreground">
                                                        {crumb.label}
                                                    </Link>
                                                </BreadcrumbLink>
                                            ) : (
                                                <BreadcrumbPage className="font-semibold text-foreground/80">
                                                    {crumb.label}
                                                </BreadcrumbPage>
                                            )}
                                        </BreadcrumbItem>
                                        {!isLast && <BreadcrumbSeparator />}
                                    </span>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}
                <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-foreground truncate leading-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}
