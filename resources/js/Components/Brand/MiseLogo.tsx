import ApplicationLogo from '@/Components/ApplicationLogo';
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
            icon: 'h-6 w-6',
            title: 'text-lg',
            gap: 'gap-2',
        },
        md: {
            icon: 'h-7 w-7',
            title: 'text-xl',
            gap: 'gap-2.5',
        },
        lg: {
            icon: 'h-9 w-9',
            title: 'text-2xl',
            gap: 'gap-3',
        },
    }[size];

    const markOnly = variant === 'icon' || variant === 'mark';

    const content = (
        <span className={`inline-flex items-center select-none ${sizeClasses.gap} ${className}`}>
            <span className="shrink-0 transition-transform group-hover:scale-105 duration-200">
                <ApplicationLogo className={`${sizeClasses.icon} drop-shadow-xs`} />
            </span>
            {!markOnly && (
                <span className="inline-flex flex-col">
                    <span className="inline-flex items-baseline">
                        <span
                            className={`font-sans font-bold tracking-tight transition-colors ${
                                sizeClasses.title
                            } ${isDark ? 'text-white' : 'text-foreground'}`}
                        >
                            Touch Dine<span className="text-primary">.</span>
                        </span>
                    </span>
                    {withTagline && tagline && (
                        <span
                            className={`font-sans text-[10px] uppercase tracking-wider font-semibold ${
                                isDark ? 'text-muted-foreground' : 'text-muted-foreground'
                            }`}
                        >
                            {tagline}
                        </span>
                    )}
                </span>
            )}
        </span>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                aria-label="Touch Dine"
            >
                {content}
            </Link>
        );
    }

    return content;
}
