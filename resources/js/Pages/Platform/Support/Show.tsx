import { Badge, Button, Card, CardBody, CardHeader, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/Label';
import { Avatar, AvatarFallback } from '@/Components/ui/Avatar';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Send, Lock, User, Building2 } from 'lucide-react';

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
const PRIORITY_TONE: Record<string, BadgeTone> = { low: 'neutral', normal: 'info', high: 'warning', urgent: 'danger' };

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

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <PlatformLayout title={ticket.subject}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <Button variant="outline" size="sm" href={route('platform.support.index')} className="h-8 px-2.5">
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            Back
                        </Button>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">{ticket.subject}</h1>
                        <Badge tone={STATUS_TONE[ticket.status] ?? 'neutral'}>{ticket.status_label}</Badge>
                        <Badge tone={PRIORITY_TONE[ticket.priority] ?? 'neutral'}>{ticket.priority}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {ticket.tenant && (
                            <Link href={route('platform.tenants.show', ticket.tenant_id)} className="font-medium text-foreground hover:underline">
                                {ticket.tenant}
                            </Link>
                        )}
                        {ticket.tenant ? ' · ' : ''}Opened {formatDate(ticket.created_at)} · {ticket.assigned_to ? `Assigned to ${ticket.assigned_to}` : 'Unassigned'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <select 
                        value={ticket.status} 
                        onChange={(e) => setStatus(e.target.value)} 
                        className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        {options.statuses.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Conversation History" description={`${ticket.messages.length} message(s) in this thread`} />
                    <CardBody className="space-y-4">
                        {ticket.messages.map((message) => (
                            <div 
                                key={message.id} 
                                className={`rounded-lg border p-4 shadow-2xs transition-colors ${
                                    message.is_internal 
                                        ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20' 
                                        : 'border-border bg-card'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-7 w-7 text-xs">
                                            <AvatarFallback className={message.is_internal ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-muted text-muted-foreground'}>
                                                {getInitials(message.author)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <span className="text-xs font-semibold text-foreground">
                                                {message.author}
                                            </span>
                                            {message.is_internal && (
                                                <Badge tone="warning" className="ml-2 py-0 text-[10px]">
                                                    <Lock className="mr-1 h-2.5 w-2.5 inline" />
                                                    Internal Note
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
                                </div>
                                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{message.body}</p>
                            </div>
                        ))}
                        {ticket.messages.length === 0 && (
                            <p className="text-center py-6 text-sm text-muted-foreground">No messages yet in this ticket.</p>
                        )}
                    </CardBody>
                </Card>

                <Card className="h-fit">
                    <CardHeader title="Post a Reply" description="Respond directly to the tenant or add internal note" />
                    <CardBody>
                        <form onSubmit={submitReply} className="space-y-3.5">
                            <div className="space-y-1.5">
                                <Textarea
                                    value={reply.data.body}
                                    onChange={(e) => reply.setData('body', e.target.value)}
                                    rows={6}
                                    placeholder="Write your reply or internal note here..."
                                />
                                {reply.errors.body && <span className="text-xs text-destructive">{reply.errors.body}</span>}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground">
                                <input 
                                    type="checkbox" 
                                    checked={internal} 
                                    onChange={(e) => setInternal(e.target.checked)} 
                                    className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring" 
                                />
                                <span className={internal ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                                    Internal note (hidden from tenant)
                                </span>
                            </label>

                            <Button size="sm" loading={reply.processing} onClick={submitReply} className="w-full">
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                {internal ? 'Add internal note' : 'Send reply'}
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
