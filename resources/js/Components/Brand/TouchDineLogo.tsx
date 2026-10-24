import { Link } from '@inertiajs/react';
import { SVGAttributes } from 'react';

export interface TouchDineLogoProps {
    variant?: 'full' | 'mark' | 'vertical';
    theme?: 'dark' | 'light' | 'auto';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    withTagline?: boolean;
    tagline?: string;
    href?: string | null;
}

/**
 * Pure SVG Touch Dine Mark:
 * Bold 'TD' monogram with rounded terminals, a cloche dome knob accent,
 * ambient culinary glow, and a real-time operations pulse node.
 */
export function TouchDineMark({
    className = 'w-9 h-9',
    theme = 'dark',
    ...props
}: SVGAttributes<SVGSVGElement> & { theme?: 'dark' | 'light' | 'auto' }) {
    const isDarkBg = theme === 'dark';
    const containerFill = isDarkBg ? '#0B271F' : '#0B271F';
    const containerBorder = isDarkBg ? '#165B47' : '#134A38';
    const primaryFill = '#FBFBF9';
    const accentFill = '#10B981';

    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`shrink-0 transition-transform duration-200 ${className}`}
            {...props}
        >
            <rect width="64" height="64" rx="16" fill={containerFill} />
            <rect
                x="1"
                y="1"
                width="62"
                height="62"
                rx="15"
                stroke={containerBorder}
                strokeWidth="1.5"
                strokeOpacity="0.75"
            />

            {/* Ambient culinary glow */}
            <circle cx="32" cy="30" r="24" fill={accentFill} fillOpacity="0.14" />

            {/* T — crossbar */}
            <rect x="10" y="17" width="20" height="7" rx="3.5" fill={primaryFill} />

            {/* T — stem */}
            <rect x="16.5" y="17" width="7" height="30" rx="3.5" fill={primaryFill} />

            {/* D — stem */}
            <rect x="35" y="17" width="7" height="30" rx="3.5" fill={primaryFill} />

            {/* D — bowl */}
            <path
                d="M42 17C49 17 55 22 55 32C55 42 49 47 42 47V40C46 40 48 36.5 48 32C48 27.5 46 24 42 24V17Z"
                fill={primaryFill}
            />

            {/* Digital service pulse dot */}
            <circle cx="45" cy="32" r="2" fill={accentFill} />
        </svg>
    );
}

export default function TouchDineLogo({
    variant = 'full',
    theme = 'light',
    size = 'md',
    className = '',
    withTagline = false,
    tagline = 'RESTAURANT OS',
    href = '/',
}: TouchDineLogoProps) {
    const isDark = theme === 'dark';

    const sizeStyles = {
        sm: {
            mark: 'w-7 h-7',
            title: 'text-lg',
            tagline: 'text-[9px]',
            gap: 'gap-2.5',
        },
        md: {
            mark: 'w-9 h-9',
            title: 'text-xl',
            tagline: 'text-[10px]',
            gap: 'gap-3',
        },
        lg: {
            mark: 'w-11 h-11',
            title: 'text-2xl',
            tagline: 'text-[11px]',
            gap: 'gap-3.5',
        },
        xl: {
            mark: 'w-14 h-14',
            title: 'text-3xl',
            tagline: 'text-xs',
            gap: 'gap-4',
        },
    }[size];

    const content = (
        <div
            className={`inline-flex items-center select-none ${
                variant === 'vertical' ? 'flex-col text-center gap-2' : sizeStyles.gap
            } ${className}`}
        >
            <TouchDineMark
                className={`${sizeStyles.mark} drop-shadow-sm hover:scale-[1.03] transition-transform`}
                theme={theme}
            />

            {variant !== 'mark' && (
                <div className={`flex flex-col ${variant === 'vertical' ? 'items-center' : 'items-start'}`}>
                    <div className="flex items-baseline tracking-tight font-display">
                        <span
                            className={`font-extrabold tracking-tight ${
                                sizeStyles.title
                            } ${isDark ? 'text-white' : 'text-[#0B271F]'}`}
                        >
                            Touch
                        </span>
                        <span
                            className={`font-semibold tracking-tight ${
                                sizeStyles.title
                            } ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
                        >
                            {' '}Dine
                        </span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 mb-1" />
                    </div>

                    {withTagline && (
                        <span
                            className={`font-semibold uppercase tracking-[0.2em] -mt-1 ${
                                sizeStyles.tagline
                            } ${isDark ? 'text-emerald-300/80' : 'text-stone-500'}`}
                        >
                            {tagline}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
                aria-label="Touch Dine - Home"
            >
                {content}
            </Link>
        );
    }

    return content;
}
