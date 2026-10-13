import { ReactNode } from 'react';
import { cn } from './cn';

export default function KpiCard({
    label,
    title,
    value,
    hint,
    icon,
    tone = 'neutral',
    trend,
    className,
}: {
    label?: string;
    title?: string;
    value: ReactNode;
    hint?: string;
    icon?: ReactNode;
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    trend?: { direction: 'up' | 'down'; label: string };
    className?: string;
}) {
    const displayLabel = label ?? title ?? '';
    const valueTone = {
        neutral: 'text-foreground',
        success: 'text-emerald-600',
        warning: 'text-amber-600',
        danger: 'text-rose-600',
    }[tone];

    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm',
                className
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                    {displayLabel}
                </span>
                {icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                        {icon}
                    </div>
                )}
            </div>

            <div className={cn('mt-2 text-2xl font-bold tracking-tight tabular-nums', valueTone)}>
                {value}
            </div>

            {(hint || trend) && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {trend && (
                        <span
                            className={cn(
                                'font-semibold',
                                trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                            )}
                        >
                            {trend.direction === 'up' ? '↑' : '↓'} {trend.label}
                        </span>
                    )}
                    {hint && <span className="truncate">{hint}</span>}
                </div>
            )}
        </div>
    );
}
