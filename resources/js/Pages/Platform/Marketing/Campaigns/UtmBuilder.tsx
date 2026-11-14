import { Alert, Button, Card, CardBody, CardHeader, FilterBar, SelectField, TextField } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

type Params = Record<(typeof FIELDS)[number], string>;

export default function UtmBuilder({
    url,
    params,
    built,
    existing,
    error,
    campaigns,
}: {
    url: string;
    params: Params;
    built: string | null;
    existing: Record<string, string>;
    error: string | null;
    campaigns: Array<{ id: number; name: string; slug: string; utm: Record<string, string> }>;
}) {
    const [state, setState] = useState({ url, ...params });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('platform.marketing.campaigns.utm'), state as never, { preserveState: true, preserveScroll: true });
    };

    const apply = (campaign: (typeof campaigns)[number]) =>
        setState({
            url: state.url,
            utm_source: campaign.utm.utm_source ?? '',
            utm_medium: campaign.utm.utm_medium ?? '',
            utm_campaign: campaign.utm.utm_campaign ?? '',
            utm_term: campaign.utm.utm_term ?? '',
            utm_content: campaign.utm.utm_content ?? '',
        });

    return (
        <PlatformLayout title="UTM builder" description="Build an attributable link without losing what is already in the URL.">
            <Head title="UTM builder" />

            <Alert variant="info" title="Existing parameters are preserved">
                Any query parameter already on the destination survives; only the five UTM keys you fill in are set. The
                URL is composed on the server, so what you copy is exactly what is validated.
            </Alert>

            <form onSubmit={submit}>
                <Card>
                    <CardHeader title="Destination" description="Where the link should go." />
                    <CardBody className="space-y-4">
                        <TextField label="URL" value={state.url} onChange={(value) => setState((p) => ({ ...p, url: value }))} error={error ?? undefined} placeholder="https://example.com/pricing" />

                        {Object.keys(existing).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Already present: {Object.entries(existing).map(([key, value]) => `${key}=${value}`).join(' · ')}
                            </p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            {FIELDS.map((field) => (
                                <TextField
                                    key={field}
                                    label={field}
                                    value={state[field]}
                                    onChange={(value) => setState((p) => ({ ...p, [field]: value }))}
                                />
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" size="sm">
                                Build link
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </form>

            {built && (
                <Card>
                    <CardHeader title="Your link" description="Copy it into the campaign, the ad or the email." />
                    <CardBody>
                        <code className="block break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                            {built}
                        </code>
                    </CardBody>
                </Card>
            )}

            {campaigns.length > 0 && (
                <FilterBar>
                    <SelectField
                        label="Fill from a campaign"
                        value=""
                        options={[{ value: '', label: 'Choose…' }, ...campaigns.map((c) => ({ value: c.slug, label: c.name }))]}
                        onChange={(value) => {
                            const match = campaigns.find((c) => c.slug === value);
                            if (match) apply(match);
                        }}
                    />
                </FilterBar>
            )}
        </PlatformLayout>
    );
}
