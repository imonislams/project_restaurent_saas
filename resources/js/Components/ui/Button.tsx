import { Link } from '@inertiajs/react';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'subtle' | 'outline' | 'indigo' | 'brand';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'border border-transparent bg-restrly-600 text-white shadow-sm hover:bg-restrly-700 active:bg-restrly-800 focus-visible:ring-restrly-500',
    secondary: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:ring-gray-400',
    outline: 'border border-restrly-600 text-restrly-700 bg-transparent hover:bg-restrly-50 active:bg-restrly-100 focus-visible:ring-restrly-500',
    danger: 'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
    success: 'border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
    ghost: 'border border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:ring-gray-400',
    subtle: 'border border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-400',
    indigo: 'border border-transparent bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
    brand: 'border border-transparent bg-restrly-600 text-white shadow-sm hover:bg-restrly-700 active:bg-restrly-800 focus-visible:ring-restrly-500',
};

const SIZES: Record<ButtonSize, string> = {
    xs: 'h-7 gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md',
    sm: 'h-9 gap-1.5 px-3.5 py-2 text-xs font-semibold sm:text-sm sm:font-medium rounded-lg',
    md: 'h-10 gap-2 px-4 py-2.5 text-sm font-medium rounded-lg',
    lg: 'h-11 gap-2.5 px-5 py-3 text-base font-semibold rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
    href?: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
}

export default function Button({
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
}: ButtonProps) {
    const classes = cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-medium leading-none transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
    );

    if (href) {
        return (
            <Link href={href} method={method as never} as={method && method !== 'get' ? 'button' : 'a'} className={classes}>
                {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
                {children}
            </Link>
        );
    }

    return (
        <button className={classes} disabled={disabled || loading} {...rest}>
            {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
            {children}
        </button>
    );
}
