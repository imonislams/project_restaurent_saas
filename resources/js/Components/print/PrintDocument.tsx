import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/Components/ui/cn';

export interface PrintMeta {
    label: string;
    value: ReactNode;
}

export interface PrintDocumentProps {
    /** Report / document title printed below the company name. */
    title: string;
    /** Date or date range shown in the printed header. */
    dateRange?: string;
    /** Paper orientation for this document. Defaults to portrait. */
    orientation?: 'portrait' | 'landscape';
    /** Optional extra header facts (e.g. branch, cashier, totals). */
    meta?: PrintMeta[];
    className?: string;
    children: ReactNode;
}

/**
 * Wraps the printable region of a page. On screen it renders the children
 * unchanged; in print it emits an A4 page size and a clean document header
 * (company, title, date range, branch, generated timestamp) above the content.
 */
export default function PrintDocument({
    title,
    dateRange,
    orientation = 'portrait',
    meta,
    className,
    children,
}: PrintDocumentProps) {
    const page = usePage().props as Record<string, any>;
    const tenantName = (page.tenant?.name as string | undefined) ?? 'TouchDine';
    const logoUrl = page.tenant?.logo_url as string | null | undefined;

    const branches = (page.branches ?? []) as { id: number | string; name: string }[];
    const activeBranchId = page.active_branch_id as number | string | null | undefined;
    const branchName = branches.find((branch) => String(branch.id) === String(activeBranchId))?.name;
    const generatedAt = new Date().toLocaleString();

    return (
        <div className="print-document" data-print-orientation={orientation}>
            <style
                dangerouslySetInnerHTML={{
                    __html: `@page { size: A4 ${orientation}; margin: 12mm; }`,
                }}
            />

            <header className="hidden border-b border-gray-300 pb-3 print:block">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {logoUrl && <img src={logoUrl} alt={tenantName} className="h-10 w-10 object-contain" />}
                        <div>
                            <div className="text-lg font-bold leading-tight text-gray-900">{tenantName}</div>
                            {branchName && <div className="text-xs text-gray-600">{branchName}</div>}
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                        {dateRange && <div>{dateRange}</div>}
                        <div>Generated: {generatedAt}</div>
                    </div>
                </div>

                <h1 className="mt-3 text-xl font-bold text-gray-900">{title}</h1>

                {meta && meta.length > 0 && (
                    <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700">
                        {meta.map((item) => (
                            <div key={item.label} className="flex gap-1">
                                <dt className="font-medium text-gray-500">{item.label}:</dt>
                                <dd>{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </header>

            <div className={cn('print-area', className)}>{children}</div>
        </div>
    );
}
