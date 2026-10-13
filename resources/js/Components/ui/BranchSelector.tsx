import Icon from '@/Components/Icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/DropdownMenu';
import { BranchSummary } from '@/types';
import { router } from '@inertiajs/react';
import { Check, ChevronsUpDown, Store } from 'lucide-react';
import { cn } from './cn';

export default function BranchSelector({
    branches = [],
    activeBranchId,
    className,
    compact = false,
}: {
    branches?: BranchSummary[];
    activeBranchId?: number | null;
    className?: string;
    compact?: boolean;
}) {
    const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0];

    if (!activeBranch || branches.length === 0) {
        return null;
    }

    if (branches.length === 1) {
        return (
            <div
                className={cn(
                    'flex items-center gap-2 rounded-md border border-sidebar-border/80 bg-sidebar-accent/50 px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground',
                    className
                )}
            >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <Store className="h-3.5 w-3.5" />
                </div>
                {!compact && (
                    <div className="flex flex-col min-w-0 text-left">
                        <span className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">
                            {activeBranch.name}
                        </span>
                        {activeBranch.code && (
                            <span className="text-[10px] font-mono text-muted-foreground leading-tight">
                                {activeBranch.code}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const switchBranch = (branchId: number) => {
        if (branchId === activeBranch.id) return;
        router.post(route('branch.switch'), { branch_id: branchId }, { preserveScroll: true });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'group flex w-full items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground shadow-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring cursor-pointer select-none',
                        compact && 'justify-center p-2',
                        className
                    )}
                    title={`Current branch: ${activeBranch.name}`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                            <Store className="h-3.5 w-3.5" />
                        </div>
                        {!compact && (
                            <div className="flex flex-col min-w-0 text-left">
                                <span className="truncate text-xs font-semibold text-sidebar-foreground leading-tight">
                                    {activeBranch.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                    {activeBranch.code ? `Branch ${activeBranch.code}` : 'Active Location'}
                                </span>
                            </div>
                        )}
                    </div>
                    {!compact && (
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-sidebar-foreground" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-56 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground"
            >
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Switch Location ({branches.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {branches.map((b) => {
                    const isCurrent = b.id === activeBranch.id;
                    return (
                        <DropdownMenuItem
                            key={b.id}
                            onClick={() => switchBranch(b.id)}
                            className={cn(
                                'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer transition-colors',
                                isCurrent && 'bg-accent font-semibold text-accent-foreground'
                            )}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className={cn(
                                        'h-1.5 w-1.5 shrink-0 rounded-full',
                                        isCurrent ? 'bg-primary' : 'bg-muted-foreground/30'
                                    )}
                                />
                                <span className="truncate">{b.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {b.code && (
                                    <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                                        {b.code}
                                    </span>
                                )}
                                {isCurrent && <Check className="h-3.5 w-3.5 text-primary stroke-[2.5]" />}
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
