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
        'bg-[#0B271F] text-[#FBFBF9] hover:bg-[#134A38] active:bg-[#071F18] border border-[#0B271F] shadow-sm shadow-[#0B271F]/15 transition-all duration-200',
    secondary:
        'bg-[#F6F5F0] text-[#111827] hover:bg-[#ECE9E1] active:bg-[#E2DFD6] border border-[#ECE9E1] shadow-none transition-all duration-200',
    accent:
        'bg-[#10B981] text-white hover:bg-[#059669] active:bg-[#047857] border border-[#10B981] shadow-sm shadow-[#10B981]/25 transition-all duration-200',
    outline:
        'bg-transparent text-[#0B271F] hover:bg-[#0B271F]/5 active:bg-[#0B271F]/10 border border-[#0B271F]/20 hover:border-[#0B271F]/40 transition-all duration-200',
    ghost:
        'bg-transparent text-[#111827] hover:bg-black/5 active:bg-black/10 border border-transparent transition-all duration-200',
    dark:
        'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-black border border-zinc-800 transition-all duration-200',
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
    const combinedClasses = `inline-flex items-center justify-center font-medium tracking-tight select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

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
