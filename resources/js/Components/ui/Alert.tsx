import { ReactNode } from 'react';
import { cn } from './cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const VARIANTS: Record<AlertVariant, string> = {
    info: 'border-border bg-muted/40 text-foreground',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-900',
    danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

/**
 * Inline status panel. Status is never conveyed by colour alone — the title and
 * body always carry the meaning.
 */
export default function Alert({
    variant = 'info',
    title,
    children,
    icon,
    actions,
    className,
}: {
    variant?: AlertVariant;
    title?: ReactNode;
    children?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role={variant === 'danger' ? 'alert' : 'status'}
            className={cn('rounded-lg border p-4', VARIANTS[variant], className)}
        >
            <div className="flex items-start gap-3">
                {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
                <div className="min-w-0 flex-1 space-y-1">
                    {title && <p className="text-sm font-semibold">{title}</p>}
                    {children && <div className="text-sm leading-relaxed opacity-90">{children}</div>}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>
        </div>
    );
}
