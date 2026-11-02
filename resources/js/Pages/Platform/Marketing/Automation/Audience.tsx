import { Alert, Button, Card, CardBody, CardHeader, DataTable, EmptyState, FilterBar, Pagination, SelectField, Tabs, TextField } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface SubscriberRow {
    id: number;
    email: string;
    name: string | null;
    status: string;
    source: string | null;
    consent_at: string | null;
    unsubscribed_at: string | null;
}

interface SuppressionRow {
    id: number;
    email: string;
    reason: string;
    created_at: string | null;
}

export default function Audience({
    subscribers,
    suppressions,
    segments,
    filters,
    counts,
}: {
    subscribers: { data: SubscriberRow[]; links: PageLink[] };
    suppressions: { data: SuppressionRow[]; links: PageLink[] };
    segments: Array<{ id: number; name: string; type: string; rules: Record<string, string>; member_count: number }>;
    filters: { search: string };
    counts: { subscribed: number; unsubscribed: number; suppressed: number };
}) {
    const [tab, setTab] = useState('subscribers');
    const [search, setSearch] = useState(filters.search);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [blockEmail, setBlockEmail] = useState('');
    const [blockReason, setBlockReason] = useState('manual');
    const [segmentName, setSegmentName] = useState('');
    const [segmentStatus, setSegmentStatus] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importConsent, setImportConsent] = useState(false);

    const subscriberColumns: Column<SubscriberRow>[] = [
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name', render: (row) => <span className="text-xs">{row.name ?? '—'}</span> },
        { key: 'status', label: 'Status' },
        { key: 'source', label: 'Source', render: (row) => <span className="text-xs">{row.source ?? '—'}</span> },
        { key: 'consent_at', label: 'Consent', render: (row) => <span className="text-xs">{row.consent_at ? formatDateTime(row.consent_at) : '—'}</span> },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (row) => (
                <Button
                    size="xs"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => router.delete(route('platform.marketing.automation.audience.subscribers.destroy', row.id), { preserveScroll: true })}
                >
                    Remove
                </Button>
            ),
        },
    ];

    const suppressionColumns: Column<SuppressionRow>[] = [
        { key: 'email', label: 'Email' },
        { key: 'reason', label: 'Reason' },
        { key: 'created_at', label: 'Added', render: (row) => <span className="text-xs">{row.created_at ? formatDateTime(row.created_at) : '—'}</span> },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (row) => (
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => router.delete(route('platform.marketing.automation.audience.suppressions.destroy', row.id), { preserveScroll: true })}
                >
                    Remove
                </Button>
            ),
        },
    ];

    return (
        <PlatformLayout title="Audience" description="Who may be emailed, who must never be, and the segments that narrow a send.">
            <Head title="Audience" />

            <Alert variant="info" title="A subscriber row is a consent record">
                Adding someone here asserts that they opted in. An unsubscribe writes a suppression row automatically, and
                suppression is checked again at send time — so a removal here takes effect even for queued mail.
            </Alert>

            <div className="grid grid-cols-3 gap-3">
                {[
                    ['Subscribed', counts.subscribed],
                    ['Unsubscribed', counts.unsubscribed],
                    ['Suppressed', counts.suppressed],
                ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold text-foreground">{formatNumber(Number(value))}</p>
                    </div>
                ))}
            </div>

            <Tabs
                tabs={[
                    { key: 'subscribers', label: 'Subscribers' },
                    { key: 'suppression', label: 'Suppression list' },
                    { key: 'segments', label: 'Segments' },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === 'subscribers' && (
                <>
                    <FilterBar>
                        <div className="flex flex-wrap items-end gap-2">
                            <TextField label="Search" value={search} onChange={setSearch} onEnter={() => router.get(route('platform.marketing.automation.audience'), { search }, { preserveState: true, replace: true })} />
                            <Button size="sm" onClick={() => router.get(route('platform.marketing.automation.audience'), { search }, { preserveState: true, replace: true })}>Search</Button>
                        </div>
                    </FilterBar>

                    <Card>
                        <CardBody className="p-0">
                            <DataTable columns={subscriberColumns} rows={subscribers.data} rowKey={(row) => row.id} empty={<EmptyState title="No subscribers" description="Add one below, or let the unsubscribe and contact forms build the list." />} />
                        </CardBody>
                    </Card>
                    <Pagination links={subscribers.links} />

                    <Card>
                        <CardHeader
                            title="Import a list"
                            description="CSV with a header row: email,name. Suppressed addresses are never re-subscribed."
                        />
                        <CardBody className="space-y-3">
                            <input
                                type="file"
                                accept=".csv,text/csv,text/plain"
                                aria-label="Subscriber CSV file"
                                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                                className="block w-full rounded-md border border-input bg-background p-2 text-sm"
                            />
                            <label className="flex items-start gap-2 text-sm">
                                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={importConsent} onChange={(e) => setImportConsent(e.target.checked)} />
                                <span>Everyone on this list agreed to receive marketing email.</span>
                            </label>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    disabled={!importConsent || importFile === null}
                                    onClick={() =>
                                        router.post(
                                            route('platform.marketing.automation.audience.import'),
                                            { file: importFile, consent_confirmed: importConsent },
                                            {
                                                forceFormData: true,
                                                preserveScroll: true,
                                                onSuccess: () => { setImportFile(null); setImportConsent(false); },
                                            },
                                        )
                                    }
                                >
                                    Import list
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Add a subscriber" description="Only with their explicit agreement." />
                        <CardBody className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <TextField label="Email" value={email} onChange={setEmail} />
                                <TextField label="Name (optional)" value={name} onChange={setName} />
                            </div>
                            <label className="flex items-start gap-2 text-sm">
                                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                                <span>This person agreed to receive marketing email.</span>
                            </label>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    disabled={!confirmed || email.trim() === ''}
                                    onClick={() =>
                                        router.post(route('platform.marketing.automation.audience.subscribers.store'), { email, name, consent_confirmed: confirmed }, {
                                            preserveScroll: true,
                                            onSuccess: () => { setEmail(''); setName(''); setConfirmed(false); },
                                        })
                                    }
                                >
                                    Add subscriber
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}

            {tab === 'suppression' && (
                <>
                    <Card>
                        <CardBody className="p-0">
                            <DataTable columns={suppressionColumns} rows={suppressions.data} rowKey={(row) => row.id} empty={<EmptyState title="Nothing suppressed" />} />
                        </CardBody>
                    </Card>
                    <Pagination links={suppressions.links} />

                    <Card>
                        <CardHeader title="Suppress an address" description="A hard stop: it will never receive marketing email again." />
                        <CardBody className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <TextField label="Email" value={blockEmail} onChange={setBlockEmail} />
                                <SelectField
                                    label="Reason"
                                    value={blockReason}
                                    options={[
                                        { value: 'manual', label: 'Manual' },
                                        { value: 'unsubscribe', label: 'Unsubscribe' },
                                        { value: 'bounce', label: 'Bounce' },
                                        { value: 'complaint', label: 'Complaint' },
                                        { value: 'invalid', label: 'Invalid address' },
                                    ]}
                                    onChange={setBlockReason}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={blockEmail.trim() === ''}
                                    onClick={() =>
                                        router.post(route('platform.marketing.automation.audience.suppressions.store'), { email: blockEmail, reason: blockReason }, {
                                            preserveScroll: true,
                                            onSuccess: () => setBlockEmail(''),
                                        })
                                    }
                                >
                                    Suppress
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}

            {tab === 'segments' && (
                <>
                    <Card>
                        <CardHeader title="Segments" description="Each narrows a campaign's audience by the lead behind the subscriber." />
                        <CardBody className="p-0">
                            <DataTable
                                columns={[
                                    { key: 'name', label: 'Name' },
                                    { key: 'type', label: 'Type' },
                                    {
                                        key: 'rules',
                                        label: 'Rules',
                                        render: (row) => (
                                            <span className="text-xs text-muted-foreground">
                                                {Object.entries(row.rules).map(([key, value]) => `${key} = ${value}`).join(' · ') || 'everyone'}
                                            </span>
                                        ),
                                    },
                                ]}
                                rows={segments}
                                rowKey={(row) => row.id}
                                empty={<EmptyState title="No segments" description="Create one below to target a slice of the audience." />}
                            />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="New segment" description="Filters are combined." />
                        <CardBody className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <TextField label="Name" value={segmentName} onChange={setSegmentName} />
                                <SelectField
                                    label="Lead status"
                                    value={segmentStatus}
                                    options={[
                                        { value: '', label: 'Any' },
                                        { value: 'new', label: 'New' },
                                        { value: 'qualified', label: 'Qualified' },
                                        { value: 'trial_started', label: 'Trial started' },
                                        { value: 'converted', label: 'Converted' },
                                    ]}
                                    onChange={setSegmentStatus}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    disabled={segmentName.trim() === ''}
                                    onClick={() =>
                                        router.post(route('platform.marketing.automation.audience.segments.store'), { name: segmentName, lead_status: segmentStatus || null }, {
                                            preserveScroll: true,
                                            onSuccess: () => { setSegmentName(''); setSegmentStatus(''); },
                                        })
                                    }
                                >
                                    Create segment
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}
        </PlatformLayout>
    );
}
