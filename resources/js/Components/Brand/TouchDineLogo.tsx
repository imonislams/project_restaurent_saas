import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
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

/** Touch Dine mark (2x2 squares, red accent). Thin wrapper over ApplicationLogo. */
export function TouchDineMark({
    className = 'w-9 h-9',
    theme = 'light',
    ...props
}: SVGAttributes<SVGSVGElement> & { theme?: 'dark' | 'light' | 'auto' }) {
    return <ApplicationLogo tone={theme === 'dark' ? 'paper' : 'ink'} className={`shrink-0 ${className}`} {...props} />;
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
                            } ${isDark ? 'text-[#F3F2F2]' : 'text-[#201E1D]'}`}
                        >
                            Touch
                        </span>
                        <span
                            className={`font-semibold tracking-tight ${
                                sizeStyles.title
                            } ${'text-[#EC3013]'}`}
                        >
                            {' '}Dine
                        </span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EC3013] ml-0.5 mb-1" />
                    </div>

                    {withTagline && (
                        <span
                            className={`font-semibold uppercase tracking-[0.2em] -mt-1 ${
                                sizeStyles.tagline
                            } ${isDark ? 'text-[#F3F2F2]/70' : 'text-[#201E1D]/60'}`}
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
                className="inline-flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013] focus-visible:ring-offset-2 rounded-lg"
                aria-label="Touch Dine - Home"
            >
                {content}
            </Link>
        );
    }

    return content;
}
