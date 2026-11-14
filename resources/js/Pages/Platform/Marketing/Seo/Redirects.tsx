import { Alert, Button, Card, CardBody, CardHeader, DataTable, EmptyState, FilterBar, FormSection, Pagination, SelectField, TextField, TextareaField } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface RedirectRow {
    id: number;
    from_path: string;
    to_url: string;
    status_code: number;
    is_active: boolean;
    hits: number;
    last_hit_at: string | null;
    notes: string | null;
}

export default function SeoRedirects({
    redirects,
    filters,
    status_codes,
    sample,
}: {
    redirects: { data: RedirectRow[]; links: PageLink[] };
    filters: { search: string };
    status_codes: number[];
    sample: string;
}) {
    const [search, setSearch] = useState(filters.search);
    const [importOpen, setImportOpen] = useState(false);

    const create = useForm({ from_path: '', to_url: '', status_code: 301, is_active: true, notes: '' });
    const importForm = useForm({ csv: sample });

    const createErrors = create.errors as Record<string, string>;
    const importErrors = importForm.errors as Record<string, string>;

    const applySearch = () =>
        router.get(route('platform.marketing.seo.redirects'), { search }, { preserveState: true, preserveScroll: true, replace: true });

    const submitCreate: FormEventHandler = (event) => {
        event.preventDefault();
        create.post(route('platform.marketing.seo.redirects.store'), {
            preserveScroll: true,
            onSuccess: () => create.reset('from_path', 'to_url', 'notes'),
        });
    };

    const submitImport: FormEventHandler = (event) => {
        event.preventDefault();
        importForm.post(route('platform.marketing.seo.redirects.import'), {
            preserveScroll: true,
            onSuccess: () => setImportOpen(false),
        });
    };

    const columns: Column<RedirectRow>[] = [
        {
            key: 'from_path',
            label: 'From',
            render: (row) => <code className="font-mono text-[11px] text-foreground">{row.from_path}</code>,
        },
        {
            key: 'to_url',
            label: 'To',
            render: (row) => <code className="truncate font-mono text-[11px] text-muted-foreground">{row.to_url}</code>,
        },
        {
            key: 'status_code',
            label: 'Code',
            render: (row) => <span className="text-xs font-medium">{row.status_code}</span>,
        },
        {
            key: 'is_active',
            label: 'State',
            render: (row) => (
                <span className="text-xs">{row.is_active ? 'active' : 'inactive'}</span>
            ),
        },
        {
            key: 'hits',
            label: 'Hits',
            align: 'right',
            render: (row) => (
                <span className="text-xs" title={row.last_hit_at ? formatDateTime(row.last_hit_at) : 'never used'}>
                    {formatNumber(row.hits)}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                            router.put(
                                route('platform.marketing.seo.redirects.update', row.id),
                                {
                                    from_path: row.from_path,
                                    to_url: row.to_url,
                                    status_code: row.status_code,
                                    is_active: !row.is_active,
                                    notes: row.notes ?? '',
                                },
                                { preserveScroll: true },
                            )
                        }
                    >
                        {row.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                        size="xs"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                            if (window.confirm(`Delete the redirect from ${row.from_path}?`)) {
                                router.delete(route('platform.marketing.seo.redirects.destroy', row.id), {
                                    preserveScroll: true,
                                });
                            }
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PlatformLayout
            title="Redirects"
            description="Keep old URLs working. Chains and loops are refused before they can be saved."
        >
            <Head title="Redirects" />

            <Alert variant="info" title="Validated on save and again on use">
                A redirect that would point at itself, duplicate an existing one, or form a chain longer than five hops is
                rejected with the chain named. A redirect that shadows a live page can never fire — the route wins — and
                the SEO dashboard reports it.
            </Alert>

            <FilterBar>
                <div className="flex flex-wrap items-end gap-3">
                    <TextField
                        label="Search"
                        value={search}
                        placeholder="Path or destination"
                        onChange={setSearch}
                        onEnter={applySearch}
                    />
                    <Button size="sm" onClick={applySearch}>
                        Search
                    </Button>
                    <Button size="sm" variant="secondary" external href={route('platform.marketing.seo.redirects.export')}>
                        Export CSV
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setImportOpen((previous) => !previous)} aria-expanded={importOpen}>
                        {importOpen ? 'Hide import' : 'Import CSV'}
                    </Button>
                </div>
            </FilterBar>

            {importOpen && (
                <form onSubmit={submitImport}>
                    <Card>
                        <CardHeader
                            title="Bulk import"
                            description="Header row required: from_path,to_url,status_code. Existing paths are updated, invalid rows are skipped and reported."
                        />
                        <CardBody className="space-y-3">
                            <TextareaField
                                label="CSV"
                                value={importForm.data.csv}
                                onChange={(value) => importForm.setData('csv', value)}
                                error={importErrors.csv}
                                rows={6}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" loading={importForm.processing}>
                                    Import
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </form>
            )}

            <Card>
                <CardHeader title="Redirect rules" />
                <CardBody className="p-0">
                    <DataTable
                        columns={columns}
                        rows={redirects.data}
                        rowKey={(row) => row.id}
                        empty={<EmptyState title="No redirects yet" description="Add the first one below." />}
                    />
                </CardBody>
            </Card>

            <Pagination links={redirects.links} />

            <form onSubmit={submitCreate}>
                <FormSection title="Add a redirect" description="The target may be a path on this site or an absolute URL.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="From path"
                            value={create.data.from_path}
                            onChange={(value) => create.setData('from_path', value)}
                            error={createErrors.from_path}
                            placeholder="/old-page"
                        />
                        <TextField
                            label="To"
                            value={create.data.to_url}
                            onChange={(value) => create.setData('to_url', value)}
                            error={createErrors.to_url}
                            placeholder="/new-page or https://example.com/"
                        />
                        <SelectField
                            label="Status code"
                            value={String(create.data.status_code)}
                            options={status_codes.map((code) => ({
                                value: String(code),
                                label: `${code}${code === 301 ? ' — permanent' : code === 302 ? ' — temporary' : ''}`,
                            }))}
                            onChange={(value) => create.setData('status_code', Number(value))}
                            error={createErrors.status_code}
                        />
                        <TextField
                            label="Note (optional)"
                            value={create.data.notes}
                            onChange={(value) => create.setData('notes', value)}
                            error={createErrors.notes}
                            hint="Why this exists — useful a year from now."
                        />
                    </div>

                    <div className="mt-3 flex justify-end">
                        <Button type="submit" size="sm" loading={create.processing}>
                            Create redirect
                        </Button>
                    </div>
                </FormSection>
            </form>
        </PlatformLayout>
    );
}
