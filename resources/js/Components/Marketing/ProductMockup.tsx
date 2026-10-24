import { PropsWithChildren, ReactNode } from 'react';

export interface ProductMockupProps extends PropsWithChildren {
    title?: string;
    subtitle?: string;
    statusBadge?: ReactNode;
    variant?: 'browser' | 'terminal' | 'clean';
    className?: string;
}

export default function ProductMockup({
    children,
    title = 'Touch Dine POS — Live Register',
    subtitle = 'Branch 01 · Downtown Flagship',
    statusBadge,
    variant = 'browser',
    className = '',
}: ProductMockupProps) {
    if (variant === 'clean') {
        return (
            <div
                className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md ${className}`}
            >
                {children}
            </div>
        );
    }

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 p-1.5 shadow-xl sm:rounded-3xl sm:p-2.5 ${className}`}
        >
            {/* Device Hardware Top Bar */}
            <div className="relative flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stone-800 font-mono text-[11px] text-stone-300">
                        <span className="font-semibold text-white">{title}</span>
                        {subtitle && <span className="text-stone-400">· {subtitle}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                    {statusBadge ? (
                        statusBadge
                    ) : (
                        <div className="flex items-center gap-1.5 rounded-md bg-stone-800 px-2 py-0.5 text-stone-300 border border-stone-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B53014] animate-pulse" />
                            <span>CONNECTED · REALTIME</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Inner Interactive Screen Canvas */}
            <div className="relative overflow-hidden rounded-xl border border-stone-800 bg-stone-50 text-stone-900 shadow-inner">
                {children}
            </div>
        </div>
    );
}
