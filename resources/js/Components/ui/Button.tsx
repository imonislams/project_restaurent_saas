import { Link } from '@inertiajs/react';
import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from './cn';

export type ButtonVariant =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'danger'
    | 'success'
    | 'outline'
    | 'ghost'
    | 'subtle'
    | 'link'
    | 'indigo'
    | 'brand';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
    default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:ring-ring',
    primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:ring-ring',
    secondary: 'border border-input bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
    destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive',
    danger: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive',
    success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-500',
    outline: 'border border-input bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
    ghost: 'text-foreground/80 hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
    subtle: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring',
    link: 'text-primary underline-offset-4 hover:underline p-0 h-auto focus-visible:ring-ring',
    indigo: 'bg-primary text-white shadow-xs hover:bg-primary/90 focus-visible:ring-primary',
    brand: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:ring-ring',
};

const SIZES: Record<ButtonSize, string> = {
    xs: 'h-7 gap-1.5 px-2.5 text-xs font-medium rounded-md',
    sm: 'h-8 gap-1.5 px-3 text-xs font-medium rounded-md',
    md: 'h-9 gap-2 px-3.5 text-sm font-medium rounded-md',
    lg: 'h-10 gap-2 px-5 text-sm font-semibold rounded-md',
    icon: 'h-9 w-9 p-0 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
    href?: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            icon,
            href,
            method,
            className,
            children,
            disabled,
            ...rest
        },
        ref
    ) => {
        const classes = cn(
            'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
            VARIANTS[variant],
            SIZES[size],
            className,
        );

        if (href) {
            return (
                <Link
                    href={href}
                    method={method as never}
                    as={method && method !== 'get' ? 'button' : 'a'}
                    className={classes}
                >
                    {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
                    {children}
                </Link>
            );
        }

        return (
            <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
                {loading && (
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
export default Button;
