import { Badge, Button, Card, CardBody, CardHeader, Input, SelectField, Switch } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { CheckCircle, Radio, Save, Send } from 'lucide-react';

interface ProviderField {
    key: string;
    label: string;
    secret?: boolean;
    optional?: boolean;
}

interface DriverOption {
    value: string;
    label: string;
    description: string;
    fields: ProviderField[];
    credential_keys: string[];
    configured: boolean;
}

interface StreamOption {
    value: string;
    label: string;
    description: string;
    enabled: boolean;
}

export default function RealtimeIndex({
    driver,
    active,
    drivers,
    streams,
}: {
    driver: string;
    active: boolean;
    drivers: DriverOption[];
    streams: StreamOption[];
}) {
    const form = useForm<{
        driver: string;
        credentials: Record<string, string>;
        streams: Record<string, boolean>;
    }>({
        driver,
        credentials: {},
        streams: Object.fromEntries(streams.map((stream) => [stream.value, stream.enabled])),
    });

    const test = useForm({});
    const [tested, setTested] = useState(false);

    const current = drivers.find((option) => option.value === form.data.driver) ?? drivers[0];

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.realtime.update'), {
            preserveScroll: true,
            onSuccess: () => form.setData('credentials', {}),
        });
    };

    const sendTest: FormEventHandler = (event) => {
        event.preventDefault();
        test.post(route('platform.realtime.test'), { preserveScroll: true, onSuccess: () => setTested(true) });
    };

    const toggleStream = (value: string, enabled: boolean) => {
        form.setData('streams', { ...form.data.streams, [value]: enabled });
    };

    return (
        <PlatformLayout
            title="Real-time Notifications"
            description="Push alerts over websockets instead of waiting for the next refresh. Choose Pusher (cloud) or Reverb (self-hosted); credentials are encrypted at rest and never returned to the browser."
        >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Driver" description="One driver is active at a time. Off simply stops pushing — the app keeps its slow refresh." />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-5">
                            <SelectField
                                label="Active driver"
                                value={form.data.driver}
                                options={drivers.map((option) => ({ value: option.value, label: option.label }))}
                                error={form.errors.driver}
                                onChange={(value) => form.setData('driver', value)}
                            />

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Status</span>
                                {current?.configured ? (
                                    <Badge tone="success">
                                        <CheckCircle className="mr-1 h-3 w-3" /> Configured
                                    </Badge>
                                ) : (
                                    <Badge tone="warning">Incomplete — add the required credentials</Badge>
                                )}
                                {active ? <Badge tone="info">Pushing live</Badge> : <Badge tone="neutral">Not pushing</Badge>}
                            </div>

                            <p className="text-xs text-muted-foreground">{current?.description}</p>

                            {current && current.fields.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {current.fields.map((field) => (
                                        <label key={field.key} className="block space-y-1">
                                            <span className="block text-xs font-semibold tracking-tight text-foreground">
                                                {field.label}
                                                {!field.optional && <span className="ml-1 text-destructive">*</span>}
                                                {field.optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
                                            </span>
                                            <Input
                                                type={field.secret ? 'password' : 'text'}
                                                value={form.data.credentials[field.key] ?? ''}
                                                placeholder={current.credential_keys.includes(field.key) ? '•••••••• stored' : 'Not set'}
                                                onChange={(event) =>
                                                    form.setData('credentials', { ...form.data.credentials, [field.key]: event.target.value })
                                                }
                                                className="font-mono text-xs"
                                            />
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    This driver needs no credentials — every push is skipped and the app falls back to its slow refresh.
                                </p>
                            )}

                            <div className="flex justify-end border-t border-border/60 pt-3">
                                <Button type="submit" size="sm" loading={form.processing} icon={<Save className="h-3.5 w-3.5" />}>
                                    Save settings
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>

                <div className="space-y-5">
                    <Card>
                        <CardHeader title="Send test event" description="Confirms the driver really delivers — not just that credentials were saved." />
                        <CardBody>
                            <form onSubmit={sendTest} className="space-y-3">
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                    loading={test.processing}
                                    icon={<Send className="h-3.5 w-3.5" />}
                                    className="w-full"
                                >
                                    Send test event
                                </Button>
                                {tested && (
                                    <p className="flex items-center gap-1 text-xs text-emerald-600">
                                        <Radio className="h-3 w-3" /> Dispatched — the result appears in the notice below.
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    The event is sent to this browser's own private channel. If nothing arrives, the driver or its
                                    credentials are wrong — check the notice and <span className="font-mono">storage/logs/laravel.log</span>.
                                </p>
                            </form>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Hosting" description="What each driver needs." />
                        <CardBody>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <span className="font-semibold text-foreground">Pusher</span> — cloud; works on shared hosting with
                                    nothing to install or keep running.
                                </li>
                                <li>
                                    <span className="font-semibold text-foreground">Reverb</span> — your own server (
                                    <span className="font-mono">php artisan reverb:start</span>); needs a process that stays up and a
                                    reachable secure port.
                                </li>
                            </ul>
                        </CardBody>
                    </Card>
                </div>

                <Card className="lg:col-span-3">
                    <CardHeader title="What gets pushed" description="Turn a stream off if it gets noisy — the in-app bell and lists still update as they do today." />
                    <CardBody>
                        <div className="divide-y divide-border/60">
                            {streams.map((stream) => (
                                <div key={stream.value} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold tracking-tight text-foreground">{stream.label}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{stream.description}</p>
                                    </div>
                                    <Switch
                                        className="ml-auto"
                                        checked={form.data.streams[stream.value] ?? true}
                                        onCheckedChange={(checked) => toggleStream(stream.value, checked)}
                                        aria-label={stream.label}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end border-t border-border/60 pt-3">
                            <Button type="submit" size="sm" loading={form.processing} onClick={submit} icon={<Save className="h-3.5 w-3.5" />}>
                                Save streams
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
