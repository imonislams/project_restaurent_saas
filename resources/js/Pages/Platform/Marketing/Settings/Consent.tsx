import { Alert, Badge, Card, CardBody, CardHeader, DataTable, EmptyState, FormSection, TextField, TextareaField, Button } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Category {
    value: string;
    label: string;
    description: string;
    requires_consent: boolean;
}

interface ConsentRecord {
    visitor_id: string | null;
    action: string;
    version: string;
    source: string;
    categories: Record<string, boolean>;
    created_at: string | null;
}

interface Disclosure {
    cookies: Array<{ name: string; purpose: string; category: string; duration: string }>;
    third_parties: string[];
}

export default function ConsentSettings({
    settings,
    categories,
    stats,
    records,
    disclosures,
}: {
    settings: {
        banner_enabled: boolean;
        version: string;
        block_before_consent: boolean;
        retention_days: number;
        banner_text_en: string;
        banner_text_bn: string;
    };
    categories: Category[];
    stats: { granted: number; updated: number; withdrawn: number; total: number; analytics_granted_in_last_500: number };
    records: ConsentRecord[];
    disclosures: Disclosure;
}) {
    const form = useForm({
        banner_enabled: settings.banner_enabled,
        version: settings.version,
        block_before_consent: settings.block_before_consent,
        retention_days: settings.retention_days,
        banner_text_en: settings.banner_text_en,
        banner_text_bn: settings.banner_text_bn,
    });

    const errors = form.errors as Record<string, string>;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.marketing.consent.update'), { preserveScroll: true });
    };

    const recordColumns: Column<ConsentRecord>[] = [
        {
            key: 'visitor_id',
            label: 'Visitor',
            render: (row) => (
                <code className="font-mono text-[11px] text-muted-foreground">{row.visitor_id?.slice(0, 8) ?? '—'}</code>
            ),
        },
        {
            key: 'action',
            label: 'Decision',
            render: (row) => <Badge tone={row.action === 'withdrawn' ? 'warning' : 'neutral'}>{row.action}</Badge>,
        },
        {
            key: 'categories',
            label: 'Categories',
            render: (row) => (
                <span className="text-xs">
                    {Object.entries(row.categories)
                        .map(([key, granted]) => `${key}: ${granted ? 'yes' : 'no'}`)
                        .join(' · ')}
                </span>
            ),
        },
        { key: 'version', label: 'Version' },
        {
            key: 'created_at',
            label: 'When',
            render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
        },
    ];

    return (
        <PlatformLayout
            title="Consent & privacy"
            description="What the banner asks, what visitors decided, and what the site actually stores."
        >
            <Head title="Consent & privacy" />

            <Alert variant="info" title="Configured is not the same as recorded">
                {stats.total === 0
                    ? 'No consent decision has been recorded yet. Until one is, nothing non-essential is stored or dispatched.'
                    : `${stats.total} decision(s) recorded: ${stats.granted} granted, ${stats.updated} updated, ${stats.withdrawn} withdrawn.`}
            </Alert>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    ['Decisions recorded', stats.total],
                    ['Grants', stats.granted],
                    ['Withdrawals', stats.withdrawn],
                    ['Analytics allowed (last 500)', stats.analytics_granted_in_last_500],
                ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>

            <form onSubmit={submit} className="space-y-6">
                <FormSection title="Banner" description="Shown until the visitor makes a choice.">
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input"
                                checked={form.data.banner_enabled}
                                onChange={(event) => form.setData('banner_enabled', event.target.checked)}
                            />
                            <span>
                                <span className="font-medium text-foreground">Show the consent banner</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    With the banner off, tracking is still withheld unless you also allow tracking
                                    without consent below. Switching the prompt off is not the same as granting consent.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input"
                                checked={form.data.block_before_consent}
                                onChange={(event) => form.setData('block_before_consent', event.target.checked)}
                            />
                            <span>
                                <span className="font-medium text-foreground">Withhold tracking until a choice is made</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    Recommended. Turning this off begins tracking on the defaults immediately.
                                </span>
                            </span>
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Consent version"
                                value={form.data.version}
                                onChange={(value) => form.setData('version', value)}
                                error={errors.version}
                                hint="Bump this when the categories or wording change, so older consents are visibly older."
                            />
                            <TextField
                                label="Retention (days)"
                                type="number"
                                value={String(form.data.retention_days)}
                                onChange={(value) => form.setData('retention_days', Number(value) || 1)}
                                error={errors.retention_days}
                                hint="Consent records older than this are pruned."
                            />
                        </div>

                        <TextareaField
                            label="Banner text (English)"
                            value={form.data.banner_text_en}
                            onChange={(value) => form.setData('banner_text_en', value)}
                            error={errors.banner_text_en}
                            rows={3}
                        />
                        <TextareaField
                            label="Banner text (বাংলা)"
                            value={form.data.banner_text_bn}
                            onChange={(value) => form.setData('banner_text_bn', value)}
                            error={errors.banner_text_bn}
                            rows={3}
                        />
                    </div>
                </FormSection>

                <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={form.processing}>
                        Save consent settings
                    </Button>
                </div>
            </form>

            <Card>
                <CardHeader title="Categories" description="Every category the banner asks about." />
                <CardBody className="p-4">
                    <ul className="space-y-3">
                        {categories.map((category) => (
                            <li key={category.value} className="rounded-lg border border-border p-3">
                                <p className="text-sm font-semibold text-foreground">
                                    {category.label}
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {category.requires_consent ? 'requires consent' : 'always on'}
                                    </span>
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{category.description}</p>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="What the site stores" description="Disclosed here and in the public cookie policy." />
                <CardBody className="p-0">
                    <DataTable
                        columns={[
                            { key: 'name', label: 'Cookie', render: (row) => <code className="font-mono text-[11px]">{row.name}</code> },
                            { key: 'purpose', label: 'Purpose' },
                            { key: 'category', label: 'Category' },
                            { key: 'duration', label: 'Duration' },
                        ]}
                        rows={disclosures.cookies}
                        rowKey={(row) => row.name}
                    />
                    <div className="space-y-2 border-t border-border p-4">
                        {disclosures.third_parties.map((line) => (
                            <p key={line} className="text-xs leading-relaxed text-muted-foreground">
                                {line}
                            </p>
                        ))}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Recent decisions" description="Append-only: a change writes a new row." />
                <CardBody className="p-0">
                    <DataTable
                        columns={recordColumns}
                        rows={records}
                        rowKey={(row) => `${row.visitor_id}-${row.created_at}-${row.action}`}
                        empty={<EmptyState title="No decisions recorded yet" description="Once a visitor answers the banner, their decision appears here." />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
