import { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'purple' | 'cyan';

const TONES: Record<BadgeTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    neutral: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    brand: 'bg-restrly-50 text-restrly-700 ring-restrly-600/20',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
};

const DOTS: Record<BadgeTone, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-gray-400',
    brand: 'bg-restrly-600',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
};

/** Status is never communicated by colour alone — always include the label. */
export default function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone])} aria-hidden="true" />
            {children}
        </span>
    );
}
