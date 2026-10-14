import { cn } from './cn';

export default function Progress({
    value = 0,
    className,
    indicatorClassName,
}: {
    value?: number;
    className?: string;
    indicatorClassName?: string;
}) {
    const pct = Math.min(100, Math.max(0, Math.round(value)));

    return (
        <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        >
            <div
                className={cn('h-full rounded-full bg-primary transition-all duration-300 ease-out', indicatorClassName)}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}
