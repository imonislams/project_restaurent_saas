import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardBody, CardHeader } from '@/Components/ui';
import Input from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
import { formatDateTime } from '@/Components/ui/Money';
import { router } from '@inertiajs/react';
import { useState } from 'react';

export interface CredentialField {
    key: string;
    label: string;
    type: string;
    secret: boolean;
    required: boolean;
    help: string | null;
    /** Whether a value is stored. The value itself is never sent to the browser. */
    is_set: boolean;
}

export interface ProviderRow {
    provider: string;
    label: string;
    description: string;
    group: string;
    docs: string | null;
    consent: string | null;
    dispatches_events: boolean;
    syncs_data: boolean;
    driver_installed: boolean;
    is_configured: boolean;
    is_enabled: boolean;
    status: string;
    status_label: string;
    status_tone: string;
    health_status: string;
    last_ok_at: string | null;
    last_synced_at: string | null;
    last_error: string | null;
    last_error_at: string | null;
    settings: Record<string, unknown>;
    credentials: CredentialField[];
}

const TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    neutral: 'neutral',
};

/**
 * One integration: its real status, its credential fields and the actions that
 * prove it works.
 *
 * A stored secret is never rendered back — the field shows whether a value exists
 * and a blank submit keeps it. Status is always spelled out next to its colour, and
 * "configured" is never presented as "working".
 */
export default function IntegrationCard({
    row,
    busy,
    onBusy,
}: {
    row: ProviderRow;
    busy: string | null;
    onBusy: (provider: string | null) => void;
}) {
    const [values, setValues] = useState<Record<string, string>>({});

    const post = (action: string, payload: Record<string, unknown> = {}) => {
        onBusy(row.provider);
        router.post(
            route(`platform.marketing.integrations.${action}`, { provider: row.provider }),
            payload as never,
            {
                preserveScroll: true,
                onFinish: () => onBusy(null),
            },
        );
    };

    const dirty = Object.values(values).some((value) => value.trim() !== '');
    const isBusy = busy === row.provider;

    return (
        <Card>
            <CardHeader
                title={
                    <span className="flex flex-wrap items-center gap-2">
                        {row.label}
                        <Badge tone={TONE[row.status_tone] ?? 'neutral'}>{row.status_label}</Badge>
                        {row.is_enabled && <Badge tone="neutral">Switched on</Badge>}
                        {!row.is_enabled && <Badge tone="neutral">Switched off</Badge>}
                    </span>
                }
                description={row.description}
                action={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {row.docs && (
                            <Button size="xs" variant="ghost" external href={row.docs}>
                                Docs
                            </Button>
                        )}
                        <Button
                            size="xs"
                            variant="secondary"
                            loading={isBusy}
                            onClick={() => post('test')}
                            disabled={!row.is_configured}
                        >
                            Test connection
                        </Button>
                        <Button
                            size="xs"
                            variant={row.is_enabled ? 'secondary' : 'primary'}
                            disabled={isBusy || !row.is_configured}
                            onClick={() => post('toggle', { is_enabled: !row.is_enabled })}
                        >
                            {row.is_enabled ? 'Switch off' : 'Switch on'}
                        </Button>
                    </div>
                }
            />

            <CardBody className="space-y-4">
                {!row.driver_installed && (
                    <Alert variant="warning" title="Driver not installed">
                        This provider is configured but its driver is not present in this build, so it cannot send
                        anything. It will never be reported as connected.
                    </Alert>
                )}

                {row.last_error && (
                    <Alert variant="danger" title="Last failure">
                        <p>{row.last_error}</p>
                        {row.last_error_at && <p className="mt-1 opacity-80">at {formatDateTime(row.last_error_at)}</p>}
                    </Alert>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <div>
                        <dt className="text-muted-foreground">Last success</dt>
                        <dd className="font-medium text-foreground">
                            {row.last_ok_at ? formatDateTime(row.last_ok_at) : 'Never verified'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Last sync</dt>
                        <dd className="font-medium text-foreground">
                            {row.last_synced_at ? formatDateTime(row.last_synced_at) : 'Never synced'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Consent required</dt>
                        <dd className="font-medium text-foreground">{row.consent ?? 'None'}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Capabilities</dt>
                        <dd className="font-medium text-foreground">
                            {[row.dispatches_events && 'sends events', row.syncs_data && 'reads reports']
                                .filter(Boolean)
                                .join(', ') || 'browser tags only'}
                        </dd>
                    </div>
                </dl>

                {row.credentials.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {row.credentials.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`${row.provider}-${field.key}`} className="flex items-center gap-2 text-xs font-semibold">
                                    {field.label}
                                    {field.required && <span className="text-destructive">*</span>}
                                    {field.is_set && <Badge tone="neutral">set</Badge>}
                                </Label>
                                <Input
                                    id={`${row.provider}-${field.key}`}
                                    type={field.secret ? 'password' : 'text'}
                                    autoComplete="off"
                                    placeholder={field.is_set ? '•••••••• (leave blank to keep)' : ''}
                                    value={values[field.key] ?? ''}
                                    onChange={(event) =>
                                        setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                                    }
                                />
                                {field.help && <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Button
                        size="xs"
                        variant="primary"
                        disabled={!dirty || isBusy}
                        loading={isBusy}
                        onClick={() => {
                            post('update', { credentials: values });
                            setValues({});
                        }}
                    >
                        Save credentials
                    </Button>

                    {row.syncs_data && (
                        <Button size="xs" variant="secondary" disabled={isBusy || !row.is_enabled} onClick={() => post('sync')}>
                            Sync now
                        </Button>
                    )}

                    {row.dispatches_events && (
                        <Button
                            size="xs"
                            variant="secondary"
                            disabled={isBusy || !row.is_enabled || row.status !== 'connected'}
                            onClick={() => router.post(route('platform.marketing.tracking.test-event', { provider: row.provider }), {}, { preserveScroll: true })}
                        >
                            Send test event
                        </Button>
                    )}

                    {row.is_configured && (
                        <Button
                            size="xs"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={isBusy}
                            onClick={() => post('disconnect')}
                        >
                            Disconnect
                        </Button>
                    )}

                    {dirty && (
                        <span className="text-xs text-muted-foreground">
                            Unsaved changes — saving replaces only the fields you filled in.
                        </span>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}
