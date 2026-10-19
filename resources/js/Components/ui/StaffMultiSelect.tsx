import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from './cn';
import { Input } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface StaffOption {
    id: number;
    name: string;
    email?: string | null;
    roles?: string[];
}

/**
 * Searchable multi-select for assigning staff. Built from the shared shadcn
 * primitives (Popover + Input) with keyboard-accessible checkboxes.
 */
export default function StaffMultiSelect({
    label,
    value,
    options,
    onChange,
    hint,
    error,
    placeholder = 'Select staff…',
    emptyText = 'No eligible staff found.',
    disabled,
}: {
    label?: string;
    value: number[];
    options: StaffOption[];
    onChange: (value: number[]) => void;
    hint?: string;
    error?: string;
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => options.filter((option) => value.includes(option.id)),
        [options, value],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (option) =>
                option.name.toLowerCase().includes(q) ||
                (option.email ?? '').toLowerCase().includes(q) ||
                (option.roles ?? []).some((role) => role.toLowerCase().includes(q)),
        );
    }, [options, query]);

    const toggle = (id: number) => {
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    };

    const remove = (id: number) => onChange(value.filter((v) => v !== id));

    return (
        <div className="block">
            {label && (
                <span className="mb-1.5 block text-xs font-semibold text-foreground tracking-tight">
                    {label}
                </span>
            )}

            <div
                className={cn(
                    'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 shadow-xs transition-colors',
                    error && 'border-destructive',
                    disabled && 'opacity-50',
                )}
            >
                {selected.map((option) => (
                    <span
                        key={option.id}
                        className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground"
                    >
                        {option.name}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => remove(option.id)}
                                aria-label={`Remove ${option.name}`}
                                className="rounded-sm text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </span>
                ))}

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            role="combobox"
                            aria-expanded={open}
                            aria-label={label ?? 'Select staff'}
                            className={cn(
                                'flex flex-1 items-center justify-between gap-1.5 rounded-sm px-1 py-0.5 text-left text-sm',
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                selected.length === 0 && 'text-muted-foreground',
                            )}
                        >
                            <span className="truncate">
                                {selected.length === 0 ? placeholder : `${selected.length} assigned`}
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, email or role…"
                                className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                filtered.map((option) => {
                                    const isSelected = value.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggle(option.id)}
                                            className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <span
                                                className={cn(
                                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input',
                                                    isSelected && 'border-primary bg-primary text-primary-foreground',
                                                )}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium text-foreground">
                                                    {option.name}
                                                </span>
                                                {(option.roles?.length || option.email) && (
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {[option.roles?.join(', '), option.email]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {error ? (
                <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>
            ) : hint ? (
                <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
            ) : null}
        </div>
    );
}
