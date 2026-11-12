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
                'flex h-full min-w-0 flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm',
                'print:rounded-none print:border-0 print:bg-transparent print:p-2 print:shadow-none',
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-words [overflow-wrap:anywhere] text-xs font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    {displayLabel}
                </span>
                {icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground print:hidden">
                        {icon}
                    </div>
                )}
            </div>

            <div className={cn('mt-2 min-w-0 break-words [overflow-wrap:anywhere] text-2xl font-bold tracking-tight tabular-nums', valueTone)}>
                {value}
            </div>

            {(hint || trend) && (
                <div className="mt-auto flex items-start gap-1.5 pt-1.5 text-xs text-muted-foreground">
                    {trend && (
                        <span
                            className={cn(
                                'shrink-0 font-semibold',
                                trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                            )}
                        >
                            {trend.direction === 'up' ? '↑' : '↓'} {trend.label}
                        </span>
                    )}
                    {hint && <span className="min-w-0 break-words">{hint}</span>}
                </div>
            )}
        </div>
    );
}
