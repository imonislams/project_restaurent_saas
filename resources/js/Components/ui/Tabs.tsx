import { ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem {
    key: string;
    label: string;
    badge?: number;
    icon?: ReactNode;
}

export interface TabsProps {
    tabs: TabItem[];
    value: string;
    onChange: (key: string) => void;
    variant?: 'underline' | 'pills';
    className?: string;
}

export default function Tabs({
    tabs,
    value,
    onChange,
    variant = 'underline',
    className,
}: TabsProps) {
    if (variant === 'pills') {
        return (
            <div
                className={cn(
                    'inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground',
                    className
                )}
                role="tablist"
            >
                {tabs.map((tab) => {
                    const active = tab.key === value;
                    return (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(tab.key)}
                            className={cn(
                                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
                                active
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'hover:text-foreground/80'
                            )}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            className={cn('flex flex-wrap gap-1 border-b border-border/80', className)}
            role="tablist"
        >
            {tabs.map((tab) => {
                const active = tab.key === value;
                return (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.key)}
                        className={cn(
                            '-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer',
                            active
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    active
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
