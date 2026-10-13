import React, { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone =
    | 'success'
    | 'warning'
    | 'danger'
    | 'destructive'
    | 'info'
    | 'neutral'
    | 'brand'
    | 'purple'
    | 'cyan'
    | 'secondary'
    | 'outline';

const TONES: Record<BadgeTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    secondary: 'bg-secondary text-secondary-foreground border-transparent',
    brand: 'bg-primary/10 text-primary border-primary/20',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    outline: 'bg-transparent text-foreground border-border',
};

const DOTS: Partial<Record<BadgeTone, string>> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    destructive: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
    secondary: 'bg-slate-400',
    brand: 'bg-primary',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone?: BadgeTone;
    variant?: BadgeTone;
    dot?: boolean;
    children: ReactNode;
    className?: string;
}

export default function Badge({
    tone,
    variant = 'neutral',
    dot = true,
    children,
    className,
    ...props
}: BadgeProps) {
    const activeTone = tone || variant;
    const dotColor = DOTS[activeTone];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors leading-none',
                TONES[activeTone],
                className,
            )}
            {...props}
        >
            {dot && dotColor && (
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} aria-hidden="true" />
            )}
            {children}
        </span>
    );
}
