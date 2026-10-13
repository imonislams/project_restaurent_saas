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
    title = 'mise.pos — Live Register',
    subtitle = 'Branch 01 · Downtown Flagship',
    statusBadge,
    variant = 'browser',
    className = '',
}: ProductMockupProps) {
    if (variant === 'clean') {
        return (
            <div
                className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-stone-900/5 ${className}`}
            >
                {children}
            </div>
        );
    }

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-stone-300/80 bg-[#1a1c1a] p-1.5 shadow-2xl shadow-stone-950/20 transition-all duration-300 sm:rounded-3xl sm:p-2.5 ${className}`}
        >
            {/* Ambient backlight glow */}
            <div className="pointer-events-none absolute -inset-1 opacity-25 blur-xl bg-gradient-to-r from-primary/25 via-secondary/20 to-primary/15" />

            {/* Device Hardware Top Bar */}
            <div className="relative flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10 font-mono text-[11px] text-stone-300">
                        <span className="font-semibold text-white">{title}</span>
                        {subtitle && <span className="text-stone-400">· {subtitle}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                    {statusBadge ? (
                        statusBadge
                    ) : (
                        <div className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-stone-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span>CONNECTED · REALTIME</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Inner Interactive Screen Canvas */}
            <div className="relative overflow-hidden rounded-xl border border-black/30 bg-stone-50 text-stone-900 shadow-inner">
                {children}
            </div>
        </div>
    );
}
