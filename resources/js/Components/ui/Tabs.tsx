import { cn } from './cn';

export interface TabItem {
    key: string;
    label: string;
    badge?: number;
}

export default function Tabs({ tabs, value, onChange, className }: { tabs: TabItem[]; value: string; onChange: (key: string) => void; className?: string }) {
    return (
        <div className={cn('flex flex-wrap gap-1 border-b border-gray-200', className)} role="tablist">
            {tabs.map((tab) => {
                const active = tab.key === value;
                return (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.key)}
                        className={cn(
                            '-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition',
                            active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        )}
                    >
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">{tab.badge}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
