import { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from './cn';

export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

export default function EmptyState({
    title,
    description,
    action,
    icon,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center animate-in fade-in-50',
                className
            )}
        >
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {icon || <PackageOpen className="h-6 w-6 stroke-[1.5]" />}
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
