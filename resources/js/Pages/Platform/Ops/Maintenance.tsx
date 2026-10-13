import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { AlertTriangle, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function OpsMaintenance({ maintenance }: { maintenance: { enabled: boolean; message: string; ends_at: string | null } }) {
    const form = useForm({
        enabled: maintenance.enabled,
        message: maintenance.message,
        ends_at: maintenance.ends_at ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.maintenance.update'), { preserveScroll: true });
    };

    return (
        <PlatformLayout title="Maintenance">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Maintenance Mode" description="Tenant workspaces, POS and APIs are temporarily blocked; platform administration, webhooks and health checks continue." />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-4">
                            <label className="flex items-center gap-2.5 rounded-lg border border-border p-3 cursor-pointer select-none transition hover:bg-muted/40">
                                <input 
                                    type="checkbox" 
                                    checked={form.data.enabled} 
                                    onChange={(e) => form.setData('enabled', e.target.checked)} 
                                    className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring" 
                                />
                                <div>
                                    <span className="text-sm font-semibold text-foreground">Enable Maintenance Mode</span>
                                    <p className="text-xs text-muted-foreground">Blocks all tenant customer access until turned off or expired.</p>
                                </div>
                            </label>

                            <div className="space-y-1.5">
                                <Label htmlFor="maint-message" className="text-xs font-medium text-muted-foreground">Tenant-Facing Message</Label>
                                <Textarea 
                                    id="maint-message"
                                    value={form.data.message} 
                                    onChange={(e) => form.setData('message', e.target.value)} 
                                    rows={3} 
                                    placeholder="We are currently undergoing scheduled maintenance..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="maint-ends" className="text-xs font-medium text-muted-foreground">Auto-Expire At (Optional)</Label>
                                <Input 
                                    id="maint-ends"
                                    type="datetime-local" 
                                    value={form.data.ends_at} 
                                    onChange={(e) => form.setData('ends_at', e.target.value)} 
                                />
                            </div>

                            <Button type="submit" size="sm" loading={form.processing}>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Save maintenance settings
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="System Impact" />
                    <CardBody>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>Tenant users cannot sign in or access POS.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>Platform administrators retain full access.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>Payment callbacks and webhooks continue processing.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>Health checks keep responding for monitoring.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>Active sessions are re-checked gracefully on next request.</span>
                            </li>
                        </ul>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
