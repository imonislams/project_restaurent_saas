import { Badge, Button, Card, CardBody, CardHeader, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface TicketView {
    id: number;
    subject: string;
    status: string;
    status_label: string;
    priority: string;
    tenant: string | null;
    tenant_id: number;
    assigned_to: string | null;
    created_at: string | null;
    resolved_at: string | null;
    messages: { id: number; author: string; body: string; is_internal: boolean; created_at: string | null }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { open: 'info', pending: 'warning', resolved: 'success', closed: 'neutral' };

export default function SupportShow({ ticket, options }: { ticket: TicketView; options: { statuses: { value: string; label: string }[] } }) {
    const [internal, setInternal] = useState(false);
    const reply = useForm({ body: '', internal: false });

    const submitReply = (e: FormEvent) => {
        e.preventDefault();
        reply.transform((data) => ({ ...data, internal }));
        reply.post(route('platform.support.reply', ticket.id), {
            preserveScroll: true,
            onSuccess: () => {
                reply.reset('body');
                setInternal(false);
            },
        });
    };

    const setStatus = (status: string) => router.post(route('platform.support.status', ticket.id), { status }, { preserveScroll: true });

    return (
        <PlatformLayout title={ticket.subject}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
                        <Badge tone={STATUS_TONE[ticket.status] ?? 'neutral'}>{ticket.status_label}</Badge>
                        <Badge tone="neutral">{ticket.priority}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {ticket.tenant && (
                            <Link href={route('platform.tenants.show', ticket.tenant_id)} className="text-indigo-600 hover:text-indigo-700">
                                {ticket.tenant}
                            </Link>
                        )}
                        {ticket.tenant ? ' · ' : ''}opened {formatDate(ticket.created_at)} · {ticket.assigned_to ? `assigned to ${ticket.assigned_to}` : 'unassigned'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={ticket.status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border-gray-300 text-sm">
                        {options.statuses.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <Link href={route('platform.support.index')} className="text-sm text-gray-500 hover:text-gray-700">
                        Back
                    </Link>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Conversation" />
                    <CardBody className="space-y-4">
                        {ticket.messages.map((message) => (
                            <div key={message.id} className={'rounded-md border px-4 py-3 ' + (message.is_internal ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white')}>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">
                                        {message.author}
                                        {message.is_internal && ' · internal note'}
                                    </span>
                                    <span>{formatDate(message.created_at)}</span>
                                </div>
                                <p className="mt-1.5 whitespace-pre-line text-sm text-gray-700">{message.body}</p>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Reply" />
                    <CardBody>
                        <form onSubmit={submitReply} className="space-y-3">
                            <textarea
                                value={reply.data.body}
                                onChange={(e) => reply.setData('body', e.target.value)}
                                rows={6}
                                placeholder="Write a reply…"
                                className="block w-full rounded-md border-gray-300 text-sm"
                            />
                            {reply.errors.body && <span className="text-xs text-red-600">{reply.errors.body}</span>}
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="rounded border-gray-300" />
                                Internal note (not shared with the tenant)
                            </label>
                            <Button size="sm" loading={reply.processing} onClick={submitReply}>
                                Add reply
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
