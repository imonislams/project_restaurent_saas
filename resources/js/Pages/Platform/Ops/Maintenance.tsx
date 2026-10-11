import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

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
                    <CardHeader title="Maintenance mode" description="Tenant workspaces, POS and APIs are blocked; the platform area, payment callbacks, webhooks and health checks continue." />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-4">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.checked)} className="rounded border-gray-300" />
                                Enable maintenance mode
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Tenant-facing message</span>
                                <textarea value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} rows={3} className="block w-full rounded-md border-gray-300 text-sm" />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Auto-expire at (optional)</span>
                                <input type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                            </label>
                            <Button type="submit" size="sm" loading={form.processing}>
                                Save maintenance settings
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Impact" />
                    <CardBody>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600">
                            <li>Tenant users cannot sign in or use the POS.</li>
                            <li>Platform administrators retain full access.</li>
                            <li>Payment callbacks and webhooks still process, so no transaction is lost.</li>
                            <li>Health checks keep responding for monitoring.</li>
                            <li>Active sessions are re-checked on their next request — nothing is terminated mid-transaction.</li>
                        </ul>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
