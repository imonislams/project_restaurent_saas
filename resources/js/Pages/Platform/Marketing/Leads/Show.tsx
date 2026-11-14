import { Badge, Button, Card, CardBody, CardHeader, FormSection, SelectField, TextField, TextareaField } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Lead {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    business_name: string | null;
    country: string | null;
    city: string | null;
    branches_count: string | null;
    restaurant_category: string | null;
    inquiry_category: string | null;
    inquiry_category_label: string;
    current_software: string | null;
    source_label: string;
    channel: string | null;
    status: string;
    status_label: string;
    score: number;
    assigned_to: number | null;
    campaign: string | null;
    tenant: { id: number; name: string } | null;
    message: string | null;
    notes: string | null;
    consent_marketing: boolean;
    lost_reason: string | null;
    created_at: string | null;
    follow_up_at: string | null;
    utm: Record<string, string | null>;
}

export default function LeadShow({
    lead,
    activities,
    options,
}: {
    lead: Lead;
    activities: Array<{ id: number; type: string; title: string; body: string | null; actor: string | null; occurred_at: string | null }>;
    options: { statuses: Array<{ value: string; label: string }>; assignees: Array<{ value: string; label: string }> };
}) {
    const form = useForm({
        status: lead.status,
        assigned_to: lead.assigned_to !== null ? String(lead.assigned_to) : '',
        follow_up_at: lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : '',
        lost_reason: lead.lost_reason ?? '',
        note: '',
    });

    const errors = form.errors as Record<string, string>;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.put(route('platform.marketing.leads.update', lead.id), { preserveScroll: true, onSuccess: () => form.setData('note', '') });
    };

    return (
        <PlatformLayout
            title={lead.name}
            description={[lead.business_name, lead.country, lead.source_label].filter(Boolean).join(' · ')}
            actions={
                <Button size="sm" variant="secondary" href={route('platform.marketing.leads.index')}>
                    Back to leads
                </Button>
            }
        >
            <Head title={lead.name} />

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader title="Lead details" description="Captured from the public site." />
                        <CardBody>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {[
                                    ['Email', lead.email],
                                    ['Phone', lead.phone ?? '—'],
                                    ['Restaurant', lead.business_name ?? '—'],
                                    ['Inquiry about', lead.inquiry_category_label],
                                    ['Venue concept', lead.restaurant_category ?? '—'],
                                    ['Branches', lead.branches_count ?? '—'],
                                    ['Current software', lead.current_software ?? '—'],
                                    ['Channel', lead.channel ?? '—'],
                                    ['Campaign', lead.campaign ?? '—'],
                                    ['Score', String(lead.score)],
                                    ['Created', lead.created_at ? formatDateTime(lead.created_at) : '—'],
                                    ['Marketing consent', lead.consent_marketing ? 'granted' : 'not granted'],
                                    ['Customer', lead.tenant?.name ?? 'not converted'],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-xs text-muted-foreground">{label}</dt>
                                        <dd className="truncate font-medium text-foreground">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {lead.message && (
                                <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
                                    {lead.message}
                                </div>
                            )}

                            {Object.values(lead.utm).some(Boolean) && (
                                <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">
                                    {Object.entries(lead.utm)
                                        .filter(([, value]) => value)
                                        .map(([key, value]) => `${key}=${value}`)
                                        .join(' · ')}
                                </p>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Activity" description="Append-only: every change is a new entry." />
                        <CardBody className="p-4">
                            {activities.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
                            ) : (
                                <ol className="space-y-3 border-l border-border pl-4">
                                    {activities.map((activity) => (
                                        <li key={activity.id} className="relative">
                                            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                                            <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                            {activity.body && <p className="mt-0.5 text-xs text-muted-foreground">{activity.body}</p>}
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {activity.occurred_at ? formatDateTime(activity.occurred_at) : ''}
                                                {activity.actor ? ` · ${activity.actor}` : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </CardBody>
                    </Card>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardHeader title="Work this lead" description="Every change is recorded on the timeline." />
                        <CardBody className="space-y-3">
                            <SelectField label="Status" value={form.data.status} options={options.statuses} onChange={(value) => form.setData('status', value)} error={errors.status} />
                            <SelectField
                                label="Owner"
                                value={form.data.assigned_to}
                                options={[{ value: '', label: 'Unassigned' }, ...options.assignees]}
                                onChange={(value) => form.setData('assigned_to', value)}
                                error={errors.assigned_to}
                            />
                            <TextField label="Follow up" type="date" value={form.data.follow_up_at} onChange={(value) => form.setData('follow_up_at', value)} error={errors.follow_up_at} />
                            <TextField label="Lost reason" value={form.data.lost_reason} onChange={(value) => form.setData('lost_reason', value)} error={errors.lost_reason} hint="Only used when the status is Lost." />
                            <TextareaField label="Note" value={form.data.note} onChange={(value) => form.setData('note', value)} error={errors.note} rows={3} />
                            <Button type="submit" size="sm" loading={form.processing} className="w-full">
                                Save changes
                            </Button>
                        </CardBody>
                    </Card>
                </form>
            </div>

            {lead.tenant && (
                <Badge tone="success">
                    Converted — linked to {lead.tenant.name} (the customer record was not duplicated)
                </Badge>
            )}
        </PlatformLayout>
    );
}
