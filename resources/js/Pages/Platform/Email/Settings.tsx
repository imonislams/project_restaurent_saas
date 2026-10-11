import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Settings {
    mailer: string;
    host: string;
    port: string | number;
    username: string;
    encryption: string;
    from_address: string;
    from_name: string;
    has_password: boolean;
}

const input = 'block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400';

export default function EmailSettings({ settings, mailers }: { settings: Settings; mailers: string[] }) {
    const form = useForm({
        mailer: settings.mailer,
        host: settings.host,
        port: settings.port,
        username: settings.username,
        encryption: settings.encryption,
        from_address: settings.from_address,
        from_name: settings.from_name,
        password: '',
    });

    const test = useForm({ email: settings.from_address });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.email.settings.update'), { preserveScroll: true, onSuccess: () => form.setData('password', '') });
    };

    const sendTest = (e: FormEvent) => {
        e.preventDefault();
        test.post(route('platform.email.test'), { preserveScroll: true });
    };

    return (
        <PlatformLayout title="Email Provider">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Provider configuration" description="Saved to the platform settings store; the password is encrypted at rest." />
                    <CardBody>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-xs text-gray-500">Mailer</span>
                                <select className={input} value={form.data.mailer} onChange={(e) => form.setData('mailer', e.target.value)}>
                                    {mailers.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Encryption</span>
                                <select className={input} value={form.data.encryption} onChange={(e) => form.setData('encryption', e.target.value)}>
                                    <option value="">None</option>
                                    <option value="tls">tls</option>
                                    <option value="ssl">ssl</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Host</span>
                                <input className={input} value={form.data.host} onChange={(e) => form.setData('host', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Port</span>
                                <input className={input} value={form.data.port} onChange={(e) => form.setData('port', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Username</span>
                                <input className={input} value={form.data.username} onChange={(e) => form.setData('username', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Password</span>
                                <input type="password" className={input} placeholder={settings.has_password ? '•••••• stored' : 'Not set'} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">From address</span>
                                <input className={input} value={form.data.from_address} onChange={(e) => form.setData('from_address', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">From name</span>
                                <input className={input} value={form.data.from_name} onChange={(e) => form.setData('from_name', e.target.value)} />
                            </label>
                            <div className="sm:col-span-2">
                                <Button type="submit" size="sm" loading={form.processing}>
                                    Save settings
                                </Button>
                                {Object.values(form.errors)[0] && <span className="ml-3 text-sm text-red-600">{Object.values(form.errors)[0]}</span>}
                            </div>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Send a test email" description="Confirms the configured transport works" />
                    <CardBody>
                        <form onSubmit={sendTest} className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Recipient</span>
                                <input className={input} value={test.data.email} onChange={(e) => test.setData('email', e.target.value)} />
                                {test.errors.email && <span className="text-xs text-red-600">{test.errors.email}</span>}
                            </label>
                            <Button type="submit" size="sm" variant="secondary" loading={test.processing}>
                                Send test email
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
