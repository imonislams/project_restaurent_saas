import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface LogRow {
    id: number;
    to: string;
    subject: string | null;
    status: string;
    mailer: string | null;
    attempts: number;
    error: string | null;
    has_body: boolean;
    retryable: boolean;
    sent_at: string | null;
    failed_at: string | null;
    created_at: string | null;
}

interface PreviewData {
    id: number;
    to: string;
    from: string | null;
    subject: string | null;
    status: string;
    mailer: string | null;
    error: string | null;
    content_type: string | null;
    body: string | null;
    retryable: boolean;
    sent_at: string | null;
    failed_at: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { sent: 'success', failed: 'danger', queued: 'warning' };

const fmt = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function EmailLogs({
    logs,
    filters,
    title,
}: {
    logs: Paginated<LogRow>;
    filters: { search: string; status: string };
    title: string;
}) {
    const [state, setState] = useState(filters);
    const [previewId, setPreviewId] = useState<number | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop');

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.email.logs'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openPreview = async (row: LogRow) => {
        setPreviewId(row.id);
        setPreview(null);
        setPreviewError(false);
        setPreviewLoading(true);
        setPreviewWidth('desktop');

        try {
            const { data } = await window.axios.get<PreviewData>(route('platform.email.preview', row.id));
            setPreview(data);
        } catch {
            setPreviewError(true);
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewId(null);
        setPreview(null);
        setPreviewError(false);
    };

    const columns: Column<LogRow>[] = [
        { key: 'to', label: 'To' },
        { key: 'subject', label: 'Subject', render: (r) => r.subject ?? '(no subject)' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        { key: 'mailer', label: 'Mailer', render: (r) => r.mailer ?? '—' },
        { key: 'attempts', label: 'Attempts', align: 'right' },
        { key: 'error', label: 'Error', render: (r) => <span className="text-xs text-red-600">{r.error ? r.error.slice(0, 80) : '—'}</span> },
        { key: 'created_at', label: 'When', render: (r) => fmt(r.created_at) },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <div className="flex items-center justify-end gap-3">
                    {r.has_body ? (
                        <button onClick={() => openPreview(r)} className="text-xs font-medium text-primary hover:text-primary/80">
                            Preview
                        </button>
                    ) : (
                        <span className="text-xs text-muted-foreground" title="The body of this message was not captured.">
                            No preview
                        </span>
                    )}
                    {r.retryable && (
                        <button onClick={() => router.post(route('platform.email.retry', r.id), {}, { preserveScroll: true })} className="text-xs font-medium text-primary hover:text-primary/80">
                            Retry
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const widthClass = (active: boolean) =>
        'rounded-md px-3 py-1 text-xs font-medium transition ' + (active ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground');

    return (
        <PlatformLayout title={title}>
            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Recipient or subject" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField
                    label="Status"
                    value={state.status}
                    options={[
                        { value: '', label: 'Any status' },
                        { value: 'sent', label: 'Sent' },
                        { value: 'failed', label: 'Failed' },
                        { value: 'queued', label: 'Queued' },
                    ]}
                    onChange={(v) => apply({ status: v })}
                />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={logs.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={logs.links} />

            <Drawer show={previewId !== null} onClose={closePreview} width="max-w-2xl" title={preview?.subject ?? 'Email preview'}>
                {previewLoading ? (
                    <p className="text-sm text-muted-foreground">Loading preview…</p>
                ) : previewError ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Could not load this preview. Please close and try again.</p>
                ) : preview ? (
                    <div className="space-y-4">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm sm:grid-cols-2">
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">To:</dt>
                                <dd className="truncate font-medium text-foreground">{preview.to}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">From:</dt>
                                <dd className="truncate font-medium text-foreground">{preview.from ?? '—'}</dd>
                            </div>
                            <div className="flex items-center gap-2">
                                <dt className="text-muted-foreground">Status:</dt>
                                <dd>
                                    <Badge tone={TONE[preview.status] ?? 'neutral'}>{preview.status}</Badge>
                                </dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Mailer:</dt>
                                <dd className="truncate font-medium text-foreground">{preview.mailer ?? '—'}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">When:</dt>
                                <dd className="font-medium text-foreground">{fmt(preview.sent_at ?? preview.failed_at ?? preview.created_at)}</dd>
                            </div>
                            {preview.error && (
                                <div className="flex gap-2 sm:col-span-2">
                                    <dt className="shrink-0 text-muted-foreground">Error:</dt>
                                    <dd className="font-medium text-red-600">{preview.error}</dd>
                                </div>
                            )}
                        </dl>

                        {preview.body ? (
                            <>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">Preview of the message as it was delivered.</p>
                                    <div className="inline-flex rounded-lg border border-border p-0.5">
                                        <button type="button" onClick={() => setPreviewWidth('desktop')} className={widthClass(previewWidth === 'desktop')}>
                                            Desktop
                                        </button>
                                        <button type="button" onClick={() => setPreviewWidth('mobile')} className={widthClass(previewWidth === 'mobile')}>
                                            Mobile
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center rounded-lg bg-muted/30 p-3">
                                    {preview.content_type === 'html' ? (
                                        <iframe
                                            title="Email preview"
                                            sandbox=""
                                            className="h-[520px] rounded-lg border border-border bg-background transition-all"
                                            style={{ width: previewWidth === 'mobile' ? 375 : '100%', maxWidth: '100%' }}
                                            srcDoc={preview.body}
                                        />
                                    ) : (
                                        <pre className="max-h-[520px] w-full overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs text-foreground" style={{ maxWidth: previewWidth === 'mobile' ? 375 : '100%' }}>
                                            {preview.body}
                                        </pre>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                The body of this message was not captured, so there is nothing to preview. Body capture only applies to emails logged after the feature was enabled.
                            </p>
                        )}
                    </div>
                ) : null}
            </Drawer>
        </PlatformLayout>
    );
}
