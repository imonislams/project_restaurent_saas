import { ReactNode } from 'react';
import { cn } from './cn';

/** Consistent layout for a row of filters plus right-aligned actions. */
export default function FilterBar({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
    return (
        <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
            <div className="flex flex-wrap items-end gap-2">{children}</div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
