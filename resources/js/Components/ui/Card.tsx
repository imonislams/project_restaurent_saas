import React, { HTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from './cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('min-w-0 max-w-full rounded-lg border border-border bg-card text-card-foreground shadow-sm print:rounded-none print:border-0 print:bg-transparent print:shadow-none', className)}
            {...props}
        />
    )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, title, description, action, children, ...props }, ref) => {
        if (title !== undefined || description !== undefined || action !== undefined) {
            return (
                <div
                    ref={ref}
                    className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5', className)}
                    {...props}
                >
                    <div className="space-y-1 min-w-0 flex-1">
                        {title && <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>}
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        {children}
                    </div>
                    {action && <div className="shrink-0 max-w-full">{action}</div>}
                </div>
            );
        }

        return (
            <div
                ref={ref}
                className={cn('flex flex-col space-y-1.5 p-4 sm:p-5', className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('font-semibold leading-none tracking-tight text-foreground text-sm sm:text-base', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn('text-xs text-muted-foreground', className)}
            {...props}
        />
    )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('min-w-0 p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />
    )
);
CardContent.displayName = 'CardContent';

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('min-w-0 p-4 sm:p-5', className)} {...props} />
    )
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5', className)}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';

export default Card;
