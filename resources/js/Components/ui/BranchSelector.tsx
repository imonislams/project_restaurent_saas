import Icon from '@/Components/Icon';
import { BranchSummary } from '@/types';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from './cn';

export default function BranchSelector({
    branches = [],
    activeBranchId,
    className,
}: {
    branches?: BranchSummary[];
    activeBranchId?: number | null;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeBranch || branches.length === 0) {
        return null;
    }

    if (branches.length === 1) {
        return (
            <div
                className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs font-medium text-gray-700',
                    className,
                )}
            >
                <Icon name="store" className="h-3.5 w-3.5 text-restrly-600" />
                <span className="max-w-[130px] truncate">{activeBranch.name}</span>
            </div>
        );
    }

    const switchBranch = (branchId: number) => {
        setOpen(false);
        if (branchId === activeBranch.id) return;
        router.post(route('branch.switch'), { branch_id: branchId }, { preserveScroll: true });
    };

    return (
        <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-restrly-500/20"
                aria-expanded={open}
                aria-haspopup="true"
                title="Switch branch"
            >
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-restrly-50 text-restrly-700">
                    <Icon name="store" className="h-3.5 w-3.5" />
                </div>
                <span className="max-w-[140px] truncate font-semibold text-gray-900">{activeBranch.name}</span>
                {activeBranch.code && (
                    <span className="rounded bg-gray-100 px-1 py-0.2 text-[10px] font-mono text-gray-500">
                        {activeBranch.code}
                    </span>
                )}
                <Icon name="chevron" className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', open && 'rotate-90')} />
            </button>

            {open && (
                <div className="absolute left-0 mt-1.5 w-56 origin-top-left rounded-xl border border-gray-200 bg-white p-1 shadow-elevated z-50">
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Switch Location
                    </div>
                    <div className="space-y-0.5">
                        {branches.map((b) => {
                            const isCurrent = b.id === activeBranch.id;
                            return (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => switchBranch(b.id)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition',
                                        isCurrent
                                            ? 'bg-restrly-50 font-semibold text-restrly-900'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className={cn('h-1.5 w-1.5 rounded-full', isCurrent ? 'bg-restrly-600' : 'bg-gray-300')} />
                                        <span className="truncate">{b.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {b.code && (
                                            <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono text-gray-500">
                                                {b.code}
                                            </span>
                                        )}
                                        {isCurrent && <span className="text-restrly-600 font-bold">✓</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
