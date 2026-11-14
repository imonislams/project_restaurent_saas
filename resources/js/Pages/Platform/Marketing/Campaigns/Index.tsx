import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import { formatMoney, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface CampaignRow {
    id: number;
    name: string;
    slug: string;
    channel: string;
    channel_label: string;
    status: string;
    status_label: string;
    start_date: string | null;
    end_date: string | null;
    budget: number | null;
    currency: string | null;
    spend: number;
    manual_spend: boolean;
    leads: number;
    converted: number;
    conversion_rate: number;
    attributed_revenue: number;
    utm: Record<string, string | null>;
    owner: string | null;
    landing_page: string | null;
    description?: string | null;
    notes?: string | null;
}

interface CalendarRow {
    id: number;
    name: string;
    status: string;
    channel: string;
    start_date: string | null;
    end_date: string | null;
}

type Option = { value: string; label: string };

const emptyCampaign = {
    name: '',
    channel: 'google_ads',
    status: 'draft',
    objective: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: '',
    target_country: '',
    owner_id: '',
    landing_page_id: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    notes: '',
};

export default function CampaignsIndex({
    campaigns,
    calendar,
    filters,
    options,
    currencies,
}: {
    campaigns: { data: CampaignRow[]; links: PageLink[] };
    calendar: CalendarRow[];
    filters: { search: string; status: string; channel: string; view: string };
    options: { channels: Option[]; statuses: Option[]; objectives: Option[]; plans: Option[]; landing_pages: Option[]; owners: Option[] };
    currencies: string[];
}) {
    const [state, setState] = useState(filters);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<CampaignRow | null>(null);

    const form = useForm({ ...emptyCampaign });
    const spendForm = useForm({ campaign: 0, period_start: '', period_end: '', amount: '', currency: '', notes: '' });

    const errors = form.errors as Record<string, string>;

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.marketing.campaigns.index'), next as never, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const openCreate = () => {
        setEditing(null);
        form.setData({ ...emptyCampaign, currency: currencies[0] ?? '' });
        setCreating(true);
    };

    const openEdit = (campaign: CampaignRow) => {
        setEditing(campaign);
        form.setData({
            name: campaign.name,
            channel: campaign.channel,
            status: campaign.status,
            objective: '',
            description: campaign.description ?? '',
            start_date: campaign.start_date ?? '',
            end_date: campaign.end_date ?? '',
            budget: campaign.budget !== null ? String(campaign.budget) : '',
            currency: campaign.currency ?? '',
            target_country: '',
            owner_id: '',
            landing_page_id: '',
            utm_source: campaign.utm.utm_source ?? '',
            utm_medium: campaign.utm.utm_medium ?? '',
            utm_campaign: campaign.utm.utm_campaign ?? '',
            notes: campaign.notes ?? '',
        });
        setCreating(true);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setCreating(false);
                setEditing(null);
            },
        };

        if (editing) {
            form.put(route('platform.marketing.campaigns.update', editing.id), options);
        } else {
            form.post(route('platform.marketing.campaigns.store'), options);
        }
    };

    const submitSpend: FormEventHandler = (event) => {
        event.preventDefault();
        spendForm.post(route('platform.marketing.campaigns.spend', spendForm.data.campaign), {
            preserveScroll: true,
            onSuccess: () => spendForm.reset(),
        });
    };

    const columns: Column<CampaignRow>[] = [
        {
            key: 'name',
            label: 'Campaign',
            render: (row) => (
                <button type="button" onClick={() => openEdit(row)} className="min-w-0 text-left hover:underline">
                    <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{row.slug}</span>
                </button>
            ),
        },
        { key: 'channel_label', label: 'Channel', render: (row) => <span className="text-xs">{row.channel_label}</span> },
        {
            key: 'status_label',
            label: 'Status',
            render: (row) => <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status_label}</Badge>,
        },
        { key: 'leads', label: 'Leads', align: 'right', render: (row) => formatNumber(row.leads) },
        {
            key: 'conversion_rate',
            label: 'Converted',
            align: 'right',
            render: (row) => `${formatNumber(row.converted)} (${row.conversion_rate}%)`,
        },
        {
            key: 'spend',
            label: 'Spend',
            align: 'right',
            render: (row) =>
                row.currency ? (
                    <span className="text-xs">
                        {formatMoney(row.spend, row.currency)}
                        {row.manual_spend && <span className="ml-1 text-muted-foreground">(manual)</span>}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (row) => (
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                        spendForm.setData({
                            campaign: row.id,
                            period_start: '',
                            period_end: '',
                            amount: '',
                            currency: row.currency ?? currencies[0] ?? '',
                            notes: '',
                        })
                    }
                >
                    Add spend
                </Button>
            ),
        },
    ];

    return (
        <PlatformLayout
            title="Campaigns"
            description="Marketing campaigns, the links that feed them and the spend that pays for them."
            actions={
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => apply({ view: state.view === 'calendar' ? 'list' : 'calendar' })}>
                        {state.view === 'calendar' ? 'List view' : 'Calendar view'}
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                        New campaign
                    </Button>
                </div>
            }
        >
            <Head title="Campaigns" />

            <Alert variant="info" title="Spend is labelled by where it came from">
                A figure entered here is stored as <strong>manually entered</strong> and every CAC or ROAS derived from it
                says so. Only a connected advertising API can produce live spend.
            </Alert>

            <FilterBar>
                <div className="flex flex-wrap items-end gap-3">
                    <TextField label="Search" value={state.search} onChange={(value) => setState((p) => ({ ...p, search: value }))} onEnter={() => apply()} />
                    <SelectField
                        label="Status"
                        value={state.status}
                        options={[{ value: '', label: 'All' }, ...options.statuses]}
                        onChange={(value) => apply({ status: value })}
                    />
                    <SelectField
                        label="Channel"
                        value={state.channel}
                        options={[{ value: '', label: 'All' }, ...options.channels]}
                        onChange={(value) => apply({ channel: value })}
                    />
                    <Button size="sm" onClick={() => apply()}>
                        Apply
                    </Button>
                </div>
            </FilterBar>

            {state.view === 'calendar' ? (
                <Card>
                    <CardHeader title="Campaign calendar" description="Campaigns overlapping the next six months." />
                    <CardBody className="p-4">
                        {calendar.length === 0 ? (
                            <EmptyState title="Nothing scheduled" description="Add dates to a campaign to see it here." />
                        ) : (
                            <ul className="space-y-2">
                                {calendar.map((row) => (
                                    <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{row.name}</span>
                                        <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            {row.start_date ?? '—'} → {row.end_date ?? '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardBody className="p-0">
                            <DataTable columns={columns} rows={campaigns.data} rowKey={(row) => row.id} empty={<EmptyState title="No campaigns yet" description="Create one to start attributing leads to it." />} />
                        </CardBody>
                    </Card>
                    <Pagination links={campaigns.links} />
                </>
            )}

            {spendForm.data.campaign > 0 && (
                <form onSubmit={submitSpend}>
                    <Card>
                        <CardHeader title="Record spend" description="Manual entry for a period. It is stored with source = manual." />
                        <CardBody className="grid gap-3 sm:grid-cols-3">
                            <TextField label="From" type="date" value={spendForm.data.period_start} onChange={(v) => spendForm.setData('period_start', v)} error={(spendForm.errors as Record<string, string>).period_start} />
                            <TextField label="To" type="date" value={spendForm.data.period_end} onChange={(v) => spendForm.setData('period_end', v)} error={(spendForm.errors as Record<string, string>).period_end} />
                            <TextField label="Amount" value={spendForm.data.amount} onChange={(v) => spendForm.setData('amount', v)} error={(spendForm.errors as Record<string, string>).amount} />
                            <SelectField label="Currency" value={spendForm.data.currency} options={currencies.map((c) => ({ value: c, label: c }))} onChange={(v) => spendForm.setData('currency', v)} error={(spendForm.errors as Record<string, string>).currency} />
                            <TextField label="Note" value={spendForm.data.notes} onChange={(v) => spendForm.setData('notes', v)} />
                            <div className="flex items-end gap-2">
                                <Button type="submit" size="sm" loading={spendForm.processing}>
                                    Save spend
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => spendForm.reset()}>
                                    Cancel
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </form>
            )}

            {creating && (
                <form onSubmit={submit}>
                    <Card>
                        <CardHeader
                            title={editing ? `Edit ${editing.name}` : 'New campaign'}
                            description="UTM values left blank are derived from the campaign slug when the link is built."
                            action={
                                <Button size="xs" variant="ghost" type="button" onClick={() => { setCreating(false); setEditing(null); }}>
                                    Close
                                </Button>
                            }
                        />
                        <CardBody className="grid gap-3 sm:grid-cols-2">
                            <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={errors.name} />
                            <SelectField label="Channel" value={form.data.channel} options={options.channels} onChange={(v) => form.setData('channel', v)} error={errors.channel} />
                            <SelectField label="Status" value={form.data.status} options={options.statuses} onChange={(v) => form.setData('status', v)} error={errors.status} />
                            <SelectField label="Objective" value={form.data.objective} options={[{ value: '', label: 'Not set' }, ...options.objectives]} onChange={(v) => form.setData('objective', v)} error={errors.objective} />
                            <TextField label="Start" type="date" value={form.data.start_date} onChange={(v) => form.setData('start_date', v)} error={errors.start_date} />
                            <TextField label="End" type="date" value={form.data.end_date} onChange={(v) => form.setData('end_date', v)} error={errors.end_date} />
                            <TextField label="Budget" value={form.data.budget} onChange={(v) => form.setData('budget', v)} error={errors.budget} />
                            <SelectField label="Currency" value={form.data.currency} options={[{ value: '', label: 'Not set' }, ...currencies.map((c) => ({ value: c, label: c }))]} onChange={(v) => form.setData('currency', v)} error={errors.currency} />
                            <SelectField label="Owner" value={form.data.owner_id} options={[{ value: '', label: 'Unassigned' }, ...options.owners]} onChange={(v) => form.setData('owner_id', v)} error={errors.owner_id} />
                            <SelectField label="Landing page" value={form.data.landing_page_id} options={[{ value: '', label: 'None' }, ...options.landing_pages]} onChange={(v) => form.setData('landing_page_id', v)} error={errors.landing_page_id} />
                            <TextField label="utm_source" value={form.data.utm_source} onChange={(v) => form.setData('utm_source', v)} />
                            <TextField label="utm_medium" value={form.data.utm_medium} onChange={(v) => form.setData('utm_medium', v)} />
                            <TextField label="utm_campaign" value={form.data.utm_campaign} onChange={(v) => form.setData('utm_campaign', v)} hint="Leads whose UTM campaign matches this are linked automatically." />
                            <TextField label="Target country" value={form.data.target_country} onChange={(v) => form.setData('target_country', v)} />
                            <div className="sm:col-span-2">
                                <TextField label="Description" value={form.data.description} onChange={(v) => form.setData('description', v)} />
                            </div>
                            <div className="sm:col-span-2 flex justify-end">
                                <Button type="submit" size="sm" loading={form.processing}>
                                    {editing ? 'Save campaign' : 'Create campaign'}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </form>
            )}
        </PlatformLayout>
    );
}
