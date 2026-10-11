import { Link } from '@inertiajs/react';
import { SVGAttributes } from 'react';

export interface RestrlyLogoProps {
    variant?: 'full' | 'mark' | 'vertical';
    theme?: 'dark' | 'light' | 'auto';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    withTagline?: boolean;
    tagline?: string;
    href?: string | null;
}

/**
 * Pure SVG Restrly Mark:
 * Architectural 'R' monogram gracefully fused with a luxury dining cloche (plate cover),
 * dynamic serving leg, and real-time operations pulse node.
 */
export function RestrlyMark({
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
            <circle cx="36" cy="28" r="22" fill={accentFill} fillOpacity="0.14" />

            {/* Cloche Dome Top Knob Accent */}
            <circle cx="34" cy="15" r="3" fill={accentFill} />

            {/* Foundational pillar of R */}
            <rect x="15" y="18" width="7" height="30" rx="3.5" fill={primaryFill} />

            {/* Cloche Dome & Upper Bowl of R */}
            <path
                d="M22 18H34C40.6274 18 46 23.3726 46 30C46 36.6274 40.6274 42 34 42H22V35H33.5C36.5376 35 39 32.5376 39 29.5C39 26.4624 36.5376 24 33.5 24H22V18Z"
                fill={primaryFill}
            />

            {/* Dynamic serving sweep / leg of R */}
            <path
                d="M30 35L42.5 47.5C43.5 48.5 42.8 50 41.4 50H34.5C33.4 50 32.4 49.5 31.7 48.7L22 38L30 35Z"
                fill={primaryFill}
            />

            {/* Digital Service Pulse Dot */}
            <circle cx="30" cy="30" r="2.5" fill={accentFill} />
        </svg>
    );
}

export default function RestrlyLogo({
    variant = 'full',
    theme = 'light',
    size = 'md',
    className = '',
    withTagline = false,
    tagline = 'RESTAURANT OS',
    href = '/',
}: RestrlyLogoProps) {
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
            <RestrlyMark
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
                            Restr
                        </span>
                        <span
                            className={`font-semibold tracking-tight ${
                                sizeStyles.title
                            } ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
                        >
                            ly
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
                aria-label="Restrly - Home"
            >
                {content}
            </Link>
        );
    }

    return content;
}
