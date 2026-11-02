import { Alert, Card, CardBody, CardHeader, FormSection, SelectField, TextField, Button } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface CatalogueEntry {
    value: string;
    label: string;
    category: string;
    meta_event: string | null;
}

interface Settings {
    tracking_enabled: boolean;
    attribution_model: string;
    attribution_window_days: number;
    exclude_internal: boolean;
    enabled_events: string[] | null;
}

export default function TrackingPreferences({
    settings,
    catalogue,
}: {
    settings: Settings;
    catalogue: CatalogueEntry[];
}) {
    const form = useForm({
        tracking_enabled: settings.tracking_enabled,
        attribution_model: settings.attribution_model,
        attribution_window_days: settings.attribution_window_days,
        exclude_internal: settings.exclude_internal,
        enabled_events: settings.enabled_events ?? catalogue.map((entry) => entry.value),
    });

    const errors = form.errors as Record<string, string>;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.marketing.tracking.preferences.update'), { preserveScroll: true });
    };

    const toggleEvent = (value: string) => {
        form.setData(
            'enabled_events',
            form.data.enabled_events.includes(value)
                ? form.data.enabled_events.filter((entry) => entry !== value)
                : [...form.data.enabled_events, value],
        );
    };

    return (
        <PlatformLayout
            title="Tracking preferences"
            description="What is collected, how a conversion is attributed, and which events are recorded at all."
        >
            <Head title="Tracking preferences" />

            <Alert variant="info" title="Preferences never override consent">
                Turning an event on here does not make it collectable: a visitor still has to grant the category it
                belongs to. It only narrows what is recorded when they have.
            </Alert>

            <form onSubmit={submit} className="space-y-6">
                <FormSection title="Collection" description="The master switch and internal-traffic handling.">
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input"
                                checked={form.data.tracking_enabled}
                                onChange={(event) => form.setData('tracking_enabled', event.target.checked)}
                            />
                            <span>
                                <span className="font-medium text-foreground">Collect website events</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    Turning this off stops every client-side event immediately. Server-side business
                                    records (registrations, payments) are unaffected.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input"
                                checked={form.data.exclude_internal}
                                onChange={(event) => form.setData('exclude_internal', event.target.checked)}
                            />
                            <span>
                                <span className="font-medium text-foreground">Exclude internal traffic</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    Signed-in platform admins are never tracked, so your own visits do not inflate the
                                    numbers.
                                </span>
                            </span>
                        </label>
                    </div>
                </FormSection>

                <FormSection
                    title="Attribution"
                    description="Used when a registration or payment is credited to a channel or campaign."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                            label="Model"
                            value={form.data.attribution_model}
                            options={[
                                { value: 'first_touch', label: 'First touch — credit the first visit' },
                                { value: 'last_touch', label: 'Last touch — credit the visit before converting' },
                            ]}
                            onChange={(value) => form.setData('attribution_model', value)}
                            error={errors.attribution_model}
                            hint="Both models are recorded; this one is used for the headline figures."
                        />
                        <TextField
                            label="Window (days)"
                            type="number"
                            value={String(form.data.attribution_window_days)}
                            onChange={(value) => form.setData('attribution_window_days', Number(value) || 1)}
                            error={errors.attribution_window_days}
                            hint="A touchpoint older than this no longer qualifies."
                        />
                    </div>
                </FormSection>

                <Card>
                    <CardHeader
                        title="Recorded events"
                        description="Unchecked events are dropped in the browser and rejected by the ingestion endpoint."
                    />
                    <CardBody className="p-4">
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {catalogue.map((entry) => (
                                <li key={entry.value} className="flex items-start gap-2.5">
                                    <input
                                        id={`event-${entry.value}`}
                                        type="checkbox"
                                        className="mt-0.5 h-4 w-4 rounded border-input"
                                        checked={form.data.enabled_events.includes(entry.value)}
                                        onChange={() => toggleEvent(entry.value)}
                                    />
                                    <label htmlFor={`event-${entry.value}`} className="text-sm leading-tight">
                                        <span className="font-medium text-foreground">{entry.label}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {entry.category}
                                            {entry.meta_event ? ` · Meta: ${entry.meta_event}` : ''}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={form.processing}>
                        Save preferences
                    </Button>
                </div>
            </form>
        </PlatformLayout>
    );
}
