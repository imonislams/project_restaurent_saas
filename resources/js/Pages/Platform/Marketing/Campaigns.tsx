import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, SelectField, TextField, TextareaField } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Stats {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    open_rate: number;
    click_rate: number;
    bounces: number | null;
    bounces_reason: string;
}

interface CampaignRow {
    id: number;
    name: string;
    subject: string;
    body: string;
    status: string;
    segment_id: number | null;
    template_key: string | null;
    from_name: string | null;
    from_email: string | null;
    reply_to: string | null;
    sent_at: string | null;
    track_opens: boolean;
    track_clicks: boolean;
    audience_size: number;
    stats: Stats;
    recent: Array<{ email: string; status: string; error: string | null; opened: boolean; clicked: boolean }>;
}

type Option = { value: string; label: string };

const blank = {
    name: '',
    subject: '',
    body: '',
    segment_id: '',
    template_key: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    track_opens: true,
    track_clicks: true,
};

export default function Campaigns({
    campaigns,
    segments,
    templates,
}: {
    campaigns: CampaignRow[];
    segments: Option[];
    templates: Option[];
}) {
    const [editing, setEditing] = useState<CampaignRow | null>(null);
    const [open, setOpen] = useState(false);
    const [testFor, setTestFor] = useState<number | null>(null);
    const [testEmail, setTestEmail] = useState('');

    const form = useForm({ ...blank });
    const errors = form.errors as Record<string, string>;

    const startNew = () => {
        setEditing(null);
        form.setData({ ...blank });
        setOpen(true);
    };

    const startEdit = (row: CampaignRow) => {
        setEditing(row);
        form.setData({
            name: row.name,
            subject: row.subject,
            body: row.body,
            segment_id: row.segment_id !== null ? String(row.segment_id) : '',
            template_key: row.template_key ?? '',
            from_name: row.from_name ?? '',
            from_email: row.from_email ?? '',
            reply_to: row.reply_to ?? '',
            track_opens: row.track_opens,
            track_clicks: row.track_clicks,
        });
        setOpen(true);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            form.put(route('platform.marketing.automation.campaigns.update', editing.id), options);
        } else {
            form.post(route('platform.marketing.automation.campaigns.store'), options);
        }
    };

    return (
        <PlatformLayout
            title="Email campaigns"
            description="Promotional email to marketing subscribers, delivered and tracked per recipient."
            actions={<Button size="sm" onClick={startNew}>New campaign</Button>}
        >
            <Head title="Email campaigns" />

            <Alert variant="info" title="Who receives this">
                Recipients are marketing subscribers who opted in, narrowed by the campaign's segment. Suppression, subscriber
                status and consent are re-checked at send time, so unsubscribing after queueing still takes effect.
            </Alert>

            {campaigns.length === 0 ? (
                <EmptyState title="No campaigns yet" description="Create one, send yourself a test, then send it to the audience." />
            ) : (
                campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                        <CardHeader
                            title={
                                <span className="flex flex-wrap items-center gap-2">
                                    {campaign.name}
                                    <Badge tone={campaign.status === 'sent' ? 'success' : 'neutral'}>{campaign.status}</Badge>
                                    <span className="text-xs font-normal text-muted-foreground">{campaign.audience_size} recipient(s)</span>
                                </span>
                            }
                            description={campaign.subject}
                            action={
                                <div className="flex flex-wrap gap-2">
                                    <Button size="xs" variant="secondary" onClick={() => startEdit(campaign)}>Edit</Button>
                                    <Button size="xs" variant="ghost" onClick={() => { setTestFor(campaign.id); setTestEmail(''); }}>Send test</Button>
                                    {campaign.status !== 'sent' && (
                                        <Button
                                            size="xs"
                                            onClick={() => router.post(route('platform.marketing.automation.campaigns.send', campaign.id), {}, { preserveScroll: true })}
                                        >
                                            Send
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            if (window.confirm(`Delete ${campaign.name}?`)) {
                                                router.delete(route('platform.marketing.automation.campaigns.destroy', campaign.id), { preserveScroll: true });
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            }
                        />

                        <CardBody className="space-y-4">
                            {testFor === campaign.id && (
                                <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
                                    <TextField label="Send a test to" value={testEmail} onChange={setTestEmail} />
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            router.post(
                                                route('platform.marketing.automation.campaigns.test', campaign.id),
                                                { email: testEmail },
                                                { preserveScroll: true, onSuccess: () => setTestFor(null) },
                                            )
                                        }
                                    >
                                        Send test
                                    </Button>
                                </div>
                            )}

                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                                {[
                                    ['Queued', campaign.stats.total],
                                    ['Sent', campaign.stats.sent],
                                    ['Failed', campaign.stats.failed],
                                    ['Opened', `${campaign.stats.opened} (${campaign.stats.open_rate}%)`],
                                    ['Clicked', `${campaign.stats.clicked} (${campaign.stats.click_rate}%)`],
                                    ['Unsubscribed', campaign.stats.unsubscribed],
                                    ['Bounces', campaign.stats.bounces === null ? 'not available' : campaign.stats.bounces],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className="rounded-md border border-border p-2">
                                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
                                        <dd className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {campaign.stats.bounces === null && (
                                <p className="text-xs text-muted-foreground">{campaign.stats.bounces_reason}</p>
                            )}

                            {campaign.recent.length > 0 && (
                                <div className="overflow-x-auto rounded-md border border-border">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">Recipient</th>
                                                <th className="px-3 py-2 font-semibold">Status</th>
                                                <th className="px-3 py-2 font-semibold">Opened</th>
                                                <th className="px-3 py-2 font-semibold">Clicked</th>
                                                <th className="px-3 py-2 font-semibold">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {campaign.recent.map((send) => (
                                                <tr key={send.email}>
                                                    <td className="px-3 py-1.5">{send.email}</td>
                                                    <td className="px-3 py-1.5">{send.status}</td>
                                                    <td className="px-3 py-1.5">{send.opened ? 'yes' : 'no'}</td>
                                                    <td className="px-3 py-1.5">{send.clicked ? 'yes' : 'no'}</td>
                                                    <td className="px-3 py-1.5 text-muted-foreground">{send.error ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {campaign.sent_at && (
                                <p className="text-xs text-muted-foreground">Sent {formatDateTime(campaign.sent_at)}</p>
                            )}
                        </CardBody>
                    </Card>
                ))
            )}

            {open && (
                <form onSubmit={submit}>
                    <Card>
                        <CardHeader
                            title={editing ? `Edit ${editing.name}` : 'New campaign'}
                            action={<Button size="xs" variant="ghost" type="button" onClick={() => setOpen(false)}>Close</Button>}
                        />
                        <CardBody className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <TextField label="Name" value={form.data.name} onChange={(v) => form.setData('name', v)} error={errors.name} />
                                <TextField label="Subject" value={form.data.subject} onChange={(v) => form.setData('subject', v)} error={errors.subject} />
                                <SelectField
                                    label="Segment"
                                    value={form.data.segment_id}
                                    options={[{ value: '', label: 'All subscribers' }, ...segments]}
                                    onChange={(v) => form.setData('segment_id', v)}
                                    error={errors.segment_id}
                                />
                                <SelectField
                                    label="Template"
                                    value={form.data.template_key}
                                    options={[{ value: '', label: 'Use the body below' }, ...templates]}
                                    onChange={(v) => form.setData('template_key', v)}
                                    error={errors.template_key}
                                    hint="A template replaces the body and keeps the tracked unsubscribe link."
                                />
                                <TextField label="From name" value={form.data.from_name} onChange={(v) => form.setData('from_name', v)} error={errors.from_name} />
                                <TextField label="Reply-to" value={form.data.reply_to} onChange={(v) => form.setData('reply_to', v)} error={errors.reply_to} />
                            </div>

                            <TextareaField label="Body (HTML)" value={form.data.body} onChange={(v) => form.setData('body', v)} rows={8} error={errors.body} />

                            <div className="flex flex-wrap gap-4 text-sm">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.data.track_opens} onChange={(e) => form.setData('track_opens', e.target.checked)} />
                                    Track opens
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.data.track_clicks} onChange={(e) => form.setData('track_clicks', e.target.checked)} />
                                    Track clicks
                                </label>
                            </div>

                            <div className="flex justify-end">
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
