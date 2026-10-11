import { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm', className)} {...rest}>
            {children}
        </div>
    );
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5', className)}>
            <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
                {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('px-5 py-4', className)} {...rest}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3', className)} {...rest}>
            {children}
        </div>
    );
}

export default Card;
