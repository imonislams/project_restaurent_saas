import { cn } from './cn';

export type StatusTone = 'ok' | 'warn' | 'error' | 'idle';

const DOT: Record<StatusTone, string> = {
    ok: 'bg-green-500',
    warn: 'bg-amber-500',
    error: 'bg-red-500',
    idle: 'bg-gray-400',
};

/** A small status indicator with a text label (never colour-only). */
export default function StatusDot({ tone = 'idle', label, className }: { tone?: StatusTone; label: string; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 text-sm text-gray-700', className)}>
            <span className={cn('h-2 w-2 rounded-full', DOT[tone])} aria-hidden="true" />
            {label}
        </span>
    );
}
