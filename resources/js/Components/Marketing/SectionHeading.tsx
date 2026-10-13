import { ReactNode } from 'react';

export interface SectionHeadingProps {
    badge?: string;
    title: string | ReactNode;
    description?: string | ReactNode;
    align?: 'left' | 'center';
    theme?: 'light' | 'dark';
    className?: string;
}

export default function SectionHeading({
    badge,
    title,
    description,
    align = 'center',
    theme = 'light',
    className = '',
}: SectionHeadingProps) {
    const isDark = theme === 'dark';
    const isCenter = align === 'center';

    return (
        <div
            className={`max-w-3xl ${
                isCenter ? 'mx-auto text-center' : 'text-left'
            } ${className}`}
        >
            {badge && (
                <div
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-mono uppercase tracking-widest font-semibold mb-4 ${
                        isDark
                            ? 'bg-primary/20 text-primary-fixed border border-primary/30'
                            : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{badge}</span>
                </div>
            )}

            <h2
                className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-[1.12] ${
                    isDark ? 'text-surface' : 'text-on-surface'
                }`}
            >
                {title}
            </h2>

            {description && (
                <p
                    className={`mt-4 text-base sm:text-lg leading-relaxed ${
                        isDark ? 'text-stone-300' : 'text-stone-600'
                    }`}
                >
                    {description}
                </p>
            )}
        </div>
    );
}
