import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/Components/ui/Input';
import { cn } from '@/Components/ui/cn';
import { BUTTONS } from './content/buttons';
import type { ButtonReference } from './types';

export default function ButtonReferenceTable({ moduleFilter }: { moduleFilter?: string }) {
    const [query, setQuery] = useState('');
    const [module, setModule] = useState<string>(moduleFilter ?? 'All');

    const modules = useMemo(() => {
        const values = Array.from(new Set(BUTTONS.map((button) => button.module))).sort();
        return ['All', ...values];
    }, []);

    const rows = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        return BUTTONS.filter((button) => {
            const matchesModule = module === 'All' || button.module === module;
            const matchesQuery =
                trimmed.length === 0 ||
                [button.label, button.module, button.purpose, button.action, button.result, button.permission]
                    .join(' ')
                    .toLowerCase()
                    .includes(trimmed);
            return matchesModule && matchesQuery;
        });
    }, [module, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search button name or action…"
                        className="h-8 pl-8 text-xs"
                        aria-label="Search buttons"
                    />
                </div>
                <p className="text-[11px] text-muted-foreground">
                    {rows.length} of {BUTTONS.length} documented controls
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {modules.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setModule(item)}
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            module === item
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
                {rows.map((button) => (
                    <li key={button.id} id={button.id} className="scroll-mt-24 rounded-lg border border-border bg-card p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{button.label}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {button.module}
                            </span>
                        </div>
                        <dl className="mt-2 space-y-1.5 text-[11px]">
                            <Field label="Purpose" value={button.purpose} />
                            <Field label="Action" value={button.action} />
                            <Field label="Destination" value={button.destination} />
                            <Field label="Permission" value={button.permission} mono />
                            <Field label="Expected result" value={button.result} />
                        </dl>
                    </li>
                ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead className="bg-muted/60">
                        <tr>
                            {['Button', 'Module', 'Purpose', 'Action', 'Destination', 'Permission', 'Expected result'].map(
                                (heading) => (
                                    <th
                                        key={heading}
                                        className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    >
                                        {heading}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((button) => (
                            <tr
                                key={button.id}
                                id={button.id}
                                className="scroll-mt-24 align-top transition-colors hover:bg-muted/40"
                            >
                                <td className="border-b border-border/60 px-3 py-2 text-xs font-semibold text-foreground">
                                    {button.label}
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                                    {button.module}
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                                    {button.purpose}
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px] text-foreground/90">
                                    {button.action}
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                                    {button.destination}
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px]">
                                    <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                                        {button.permission}
                                    </code>
                                </td>
                                <td className="border-b border-border/60 px-3 py-2 text-[11px] text-foreground/90">
                                    {button.result}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rows.length === 0 && (
                <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
                    No documented control matches that search.
                </p>
            )}
        </div>
    );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </dt>
            <dd className={mono ? 'font-mono text-[10px] text-foreground/80' : 'text-foreground/85'}>{value}</dd>
        </div>
    );
}

export function ButtonReferenceInline({ moduleFilter }: { moduleFilter: string }) {
    const rows: ButtonReference[] = BUTTONS.filter((button) => button.module === moduleFilter);
    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="not-prose space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Verified controls in this module
            </p>
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
                {rows.map((button) => (
                    <li key={button.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">{button.label}</span>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {button.permission}
                            </code>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{button.action}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
