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
        'bg-primary text-on-primary hover:bg-primary-container active:bg-[#8f200b] border border-primary shadow-sm shadow-primary/20 transition-all duration-200',
    secondary:
        'bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-[#dfdedb] border border-surface-container-high shadow-none transition-all duration-200',
    accent:
        'bg-secondary text-white hover:bg-[#3d5147] active:bg-[#314239] border border-secondary shadow-sm shadow-secondary/20 transition-all duration-200',
    outline:
        'bg-transparent text-primary hover:bg-primary/5 active:bg-primary/10 border border-primary/30 hover:border-primary/60 transition-all duration-200',
    ghost:
        'bg-transparent text-on-surface hover:bg-on-surface/5 active:bg-on-surface/10 border border-transparent transition-all duration-200',
    dark:
        'bg-[#1a1c1a] text-surface hover:bg-[#2f312f] active:bg-black border border-[#2f312f] transition-all duration-200',
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
