import { Link } from '@inertiajs/react';
import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    href?: string;
    external?: boolean;
    children: ReactNode;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        'bg-[#B53014] text-white hover:bg-[#9E2A11] active:bg-[#85230E] border border-[#B53014] shadow-xs transition-colors duration-150',
    secondary:
        'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-200 shadow-none transition-colors duration-150',
    accent:
        'bg-stone-900 text-white hover:bg-stone-800 active:bg-black border border-stone-900 shadow-xs transition-colors duration-150',
    outline:
        'bg-transparent text-stone-800 hover:bg-stone-50 active:bg-stone-100 border border-stone-300 transition-colors duration-150',
    ghost:
        'bg-transparent text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-transparent transition-colors duration-150',
    dark:
        'bg-stone-950 text-white hover:bg-stone-900 active:bg-black border border-stone-800 transition-colors duration-150',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-base font-semibold rounded-xl gap-2.5',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    href,
    external = false,
    children,
    icon,
    iconPosition = 'right',
    className = '',
    disabled = false,
    type = 'button',
    ...props
}: ButtonProps) {
    const combinedClasses = `inline-flex items-center justify-center font-medium tracking-tight select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    const content = (
        <>
            {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
    );

    if (href) {
        if (external) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={combinedClasses}
                >
                    {content}
                </a>
            );
        }

        return (
            <Link href={href} className={combinedClasses}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type={type}
            disabled={disabled}
            className={combinedClasses}
            {...props}
        >
            {content}
        </button>
    );
}
