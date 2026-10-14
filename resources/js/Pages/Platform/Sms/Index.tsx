import { Badge, Button, Card, CardBody, CardHeader, Input, SelectField } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { MessageSquare, Save, Send, CheckCircle } from 'lucide-react';

interface ProviderField {
    key: string;
    label: string;
    secret?: boolean;
}

interface Provider {
    value: string;
    label: string;
    fields: ProviderField[];
    credential_keys: string[];
    configured: boolean;
}

export default function SmsIndex({ driver, providers }: { driver: string; providers: Provider[] }) {
    const form = useForm<{ driver: string; credentials: Record<string, string> }>({
        driver,
        credentials: {},
    });

    const test = useForm<{ to: string }>({ to: '' });
    const [tested, setTested] = useState(false);

    const active = providers.find((p) => p.value === form.data.driver) ?? providers[0];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('platform.sms.update'), { preserveScroll: true, onSuccess: () => form.setData('credentials', {}) });
    };

    const sendTest: FormEventHandler = (e) => {
        e.preventDefault();
        test.post(route('platform.sms.test'), { preserveScroll: true, onSuccess: () => setTested(true) });
    };

    return (
        <PlatformLayout
            title="SMS Provider"
            description="Outbound SMS used for mobile verification and one-time codes. One provider is active at a time; credentials are encrypted at rest and never returned to the browser."
        >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Provider" description="Choose the gateway that delivers one-time codes." />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-5">
                            <SelectField
                                label="Active provider"
                                value={form.data.driver}
                                options={providers.map((p) => ({ value: p.value, label: p.label }))}
                                error={form.errors.driver}
                                onChange={(v) => form.setData('driver', v)}
                            />

                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Status</span>
                                {active?.configured ? (
                                    <Badge tone="success">
                                        <CheckCircle className="mr-1 h-3 w-3" /> Configured
                                    </Badge>
                                ) : (
                                    <Badge tone="warning">Incomplete — add the required credentials</Badge>
                                )}
                            </div>

                            {active && active.fields.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {active.fields.map((field) => (
                                        <label key={field.key} className="block space-y-1">
                                            <span className="block text-xs font-semibold tracking-tight text-foreground">{field.label}</span>
                                            <Input
                                                type={field.secret ? 'password' : 'text'}
                                                value={form.data.credentials[field.key] ?? ''}
                                                placeholder={active.credential_keys.includes(field.key) ? '•••••••• stored' : 'Not set'}
                                                onChange={(e) => form.setData('credentials', { ...form.data.credentials, [field.key]: e.target.value })}
                                                className={field.secret ? 'font-mono text-xs' : ''}
                                            />
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">This provider needs no credentials (messages are written to the application log).</p>
                            )}

                            <div className="flex justify-end border-t border-border/60 pt-3">
                                <Button type="submit" size="sm" loading={form.processing} icon={<Save className="h-3.5 w-3.5" />}>
                                    Save provider
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Send a test" description="Deliver a one-off message to confirm delivery." />
                    <CardBody>
                        <form onSubmit={sendTest} className="space-y-3">
                            <label className="block space-y-1">
                                <span className="block text-xs font-semibold tracking-tight text-foreground">Recipient number</span>
                                <Input
                                    value={test.data.to}
                                    placeholder="+8801XXXXXXXXX"
                                    onChange={(e) => test.setData('to', e.target.value)}
                                />
                                {test.errors.to && <span className="text-xs text-destructive">{test.errors.to}</span>}
                            </label>
                            <Button type="submit" size="sm" variant="outline" loading={test.processing} icon={<Send className="h-3.5 w-3.5" />}>
                                Send test SMS
                            </Button>
                            {tested && <p className="flex items-center gap-1 text-xs text-emerald-600"><MessageSquare className="h-3 w-3" /> Test dispatched — check the result in the flash message.</p>}
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
