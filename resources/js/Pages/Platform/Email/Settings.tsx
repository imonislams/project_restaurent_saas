import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Mail, Send, Save, KeyRound } from 'lucide-react';

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
                    <CardHeader title="Provider Configuration" description="Saved to the platform settings store; password is encrypted at rest." />
                    <CardBody>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="mailer" className="text-xs font-medium text-muted-foreground">Mailer</Label>
                                <select 
                                    id="mailer"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                                    value={form.data.mailer} 
                                    onChange={(e) => form.setData('mailer', e.target.value)}
                                >
                                    {mailers.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="encryption" className="text-xs font-medium text-muted-foreground">Encryption</Label>
                                <select 
                                    id="encryption"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                                    value={form.data.encryption} 
                                    onChange={(e) => form.setData('encryption', e.target.value)}
                                >
                                    <option value="">None</option>
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="host" className="text-xs font-medium text-muted-foreground">Host</Label>
                                <Input 
                                    id="host"
                                    value={form.data.host} 
                                    placeholder="smtp.example.com"
                                    onChange={(e) => form.setData('host', e.target.value)} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="port" className="text-xs font-medium text-muted-foreground">Port</Label>
                                <Input 
                                    id="port"
                                    value={form.data.port} 
                                    placeholder="587"
                                    onChange={(e) => form.setData('port', e.target.value)} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">Username</Label>
                                <Input 
                                    id="username"
                                    value={form.data.username} 
                                    placeholder="user@example.com"
                                    onChange={(e) => form.setData('username', e.target.value)} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                                <Input 
                                    id="password"
                                    type="password" 
                                    placeholder={settings.has_password ? '•••••• stored' : 'Enter password'} 
                                    value={form.data.password} 
                                    onChange={(e) => form.setData('password', e.target.value)} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="from_address" className="text-xs font-medium text-muted-foreground">From Address</Label>
                                <Input 
                                    id="from_address"
                                    value={form.data.from_address} 
                                    placeholder="noreply@restrly.com"
                                    onChange={(e) => form.setData('from_address', e.target.value)} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="from_name" className="text-xs font-medium text-muted-foreground">From Name</Label>
                                <Input 
                                    id="from_name"
                                    value={form.data.from_name} 
                                    placeholder="Restrly Platform"
                                    onChange={(e) => form.setData('from_name', e.target.value)} 
                                />
                            </div>

                            <div className="sm:col-span-2 pt-2 flex items-center">
                                <Button type="submit" size="sm" loading={form.processing}>
                                    <Save className="mr-1.5 h-3.5 w-3.5" />
                                    Save settings
                                </Button>
                                {Object.values(form.errors)[0] && <span className="ml-3 text-xs text-destructive">{Object.values(form.errors)[0]}</span>}
                            </div>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Send a Test Email" description="Confirms the configured mail transport operates correctly" />
                    <CardBody>
                        <form onSubmit={sendTest} className="space-y-3.5">
                            <div className="space-y-1.5">
                                <Label htmlFor="test-recipient" className="text-xs font-medium text-muted-foreground">Recipient Email</Label>
                                <Input 
                                    id="test-recipient"
                                    type="email"
                                    value={test.data.email} 
                                    placeholder="admin@example.com"
                                    onChange={(e) => test.setData('email', e.target.value)} 
                                />
                                {test.errors.email && <span className="text-xs text-destructive">{test.errors.email}</span>}
                            </div>
                            <Button type="submit" size="sm" variant="secondary" loading={test.processing} className="w-full">
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                Send test email
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
