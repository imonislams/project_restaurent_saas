import { Link } from '@inertiajs/react';

export interface MiseLogoProps {
    theme?: 'light' | 'dark';
    size?: 'sm' | 'md' | 'lg';
    href?: string | null;
    className?: string;
    variant?: 'full' | 'mark' | 'icon';
    withTagline?: boolean;
    tagline?: string;
}

export default function MiseLogo({
    theme = 'light',
    size = 'md',
    href = '/',
    className = '',
    variant = 'full',
    withTagline = false,
    tagline,
}: MiseLogoProps) {
    const isDark = theme === 'dark';

    const sizeClasses = {
        sm: {
            title: 'text-lg',
            badge: 'text-[9px] px-1 py-0.5',
        },
        md: {
            title: 'text-2xl',
            badge: 'text-[11px] px-1.5 py-0.5',
        },
        lg: {
            title: 'text-3xl',
            badge: 'text-xs px-2 py-0.5',
        },
    }[size];

    const content = (
        <span className={`inline-flex flex-col select-none ${className}`}>
            <span className="inline-flex items-baseline gap-1">
                <span
                    className={`font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight transition-colors ${
                        sizeClasses.title
                    } ${isDark ? 'text-surface-container-lowest' : 'text-on-surface'}`}
                >
                    mise<span className="text-primary">.</span>
                </span>
                <span
                    className={`font-['Space_Mono'] font-bold uppercase tracking-wider rounded ${
                        sizeClasses.badge
                    } ${
                        isDark
                            ? 'text-secondary-fixed bg-secondary-fixed/20'
                            : 'text-secondary bg-secondary-container'
                    }`}
                >
                    pos
                </span>
            </span>
            {withTagline && tagline && (
                <span className={`font-mono text-[9px] uppercase tracking-widest font-semibold ${
                    isDark ? 'text-primary-fixed' : 'text-stone-500'
                }`}>
                    {tagline}
                </span>
            )}
        </span>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex items-baseline group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label="mise.pos"
            >
                {content}
            </Link>
        );
    }

    return content;
}
