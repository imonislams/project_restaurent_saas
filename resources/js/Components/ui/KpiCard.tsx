import { ReactNode } from 'react';
import { cn } from './cn';

export default function KpiCard({
    label,
    value,
    hint,
    icon,
    tone = 'neutral',
}: {
    label: string;
    value: ReactNode;
    hint?: string;
    icon?: ReactNode;
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
    const valueTone = {
        neutral: 'text-gray-900',
        success: 'text-emerald-700',
        warning: 'text-amber-700',
        danger: 'text-red-700',
    }[tone];

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300">
            <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
                {icon && <div className="text-gray-300">{icon}</div>}
            </div>
            <div className={cn('mt-2 text-2xl font-semibold tracking-tight tabular-nums', valueTone)}>{value}</div>
            {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
        </div>
    );
}
