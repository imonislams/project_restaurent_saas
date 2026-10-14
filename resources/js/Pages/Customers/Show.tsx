import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    Money,
    PageHeader,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatDate,
    formatDateTime,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { ArrowLeft, Mail, Phone, StickyNote } from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    tags: string[];
    is_active: boolean;
    is_marketing_opt_in: boolean;
    created_at: string | null;
    points: number;
}

interface Profile {
    orders: number;
    visits: number;
    spend: number;
    average_ticket: number;
    recency_days: number;
    last_order_at: string;
    segment: string;
}

interface OrderRow {
    id: number;
    number: string;
    status: string;
    total: number;
    currency: string;
    placed_at: string | null;
}

const SEGMENT_TONE: Record<string, BadgeTone> = {
    champions: 'success',
    loyal: 'info',
    high_value: 'success',
    new: 'info',
    regular: 'neutral',
    at_risk: 'warning',
    lost: 'danger',
};

const SEGMENT_LABEL: Record<string, string> = {
    champions: 'Champions',
    loyal: 'Loyal',
    high_value: 'High-value',
    new: 'New',
    regular: 'Regular',
    at_risk: 'At risk',
    lost: 'Lost',
};

const STATUS_TONE: Record<string, BadgeTone> = {
    completed: 'success',
    held: 'info',
    pending: 'warning',
    voided: 'danger',
    open: 'info',
};

export default function CustomerShow({
    customer,
    profile,
    orders,
    loyaltyEnabled,
}: {
    customer: Customer;
    profile: Profile | null;
    orders: OrderRow[];
    loyaltyEnabled: boolean;
}) {
    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumb={[{ label: 'Customers', href: route('customers.index') }, { label: customer.name }]}
                    title={<span className="flex items-center gap-3">{customer.name}{profile && <Badge tone={SEGMENT_TONE[profile.segment] ?? 'neutral'}>{SEGMENT_LABEL[profile.segment] ?? profile.segment}</Badge>}</span>}
                    description={customer.email ?? customer.phone ?? 'Guest profile'}
                    actions={
                        <Button size="sm" variant="secondary" href={route('customers.index')} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                            Back to customers
                        </Button>
                    }
                />
            }
        >
            <Head title={customer.name} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <KpiCard label="Lifetime spend" value={<Money amount={profile?.spend ?? 0} />} hint={profile ? `Last order ${formatDate(profile.last_order_at)}` : undefined} />
                        <KpiCard label="Visits" value={profile?.visits ?? 0} hint="Dining sessions" />
                        <KpiCard label="Orders" value={profile?.orders ?? 0} hint="Completed orders" />
                        <KpiCard label="Average ticket" value={<Money amount={profile?.average_ticket ?? 0} />} hint={profile ? `Recency ${profile.recency_days}d` : undefined} tone="neutral" />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-1">
                            <CardHeader title="Profile" />
                            <CardBody className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{customer.phone ?? 'No phone'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-foreground">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="truncate">{customer.email ?? 'No email'}</span>
                                </div>
                                {customer.notes && (
                                    <div className="flex items-start gap-2 text-foreground">
                                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">{customer.notes}</span>
                                    </div>
                                )}

                                {customer.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {customer.tags.map((tag) => (
                                            <span key={tag} className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-1.5 border-t border-border/60 pt-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge tone={customer.is_active ? 'success' : 'neutral'}>{customer.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Marketing</span>
                                        <Badge tone={customer.is_marketing_opt_in ? 'success' : 'neutral'}>{customer.is_marketing_opt_in ? 'Opted in' : 'Opted out'}</Badge>
                                    </div>
                                    {loyaltyEnabled && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Loyalty points</span>
                                            <span className="font-semibold tabular-nums text-foreground">{customer.points.toLocaleString()} pts</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Customer since</span>
                                        <span className="font-medium text-foreground">{formatDate(customer.created_at)}</span>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader title="Recent orders" description="Last 20 orders for this guest" />
                            <CardBody className="p-0">
                                {orders.length === 0 ? (
                                    <EmptyState title="No orders yet" description="This guest has no recorded orders." />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="px-5 py-3">Order</TableHead>
                                                <TableHead className="px-5 py-3">Placed</TableHead>
                                                <TableHead className="px-5 py-3 text-center">Status</TableHead>
                                                <TableHead className="px-5 py-3 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders.map((order) => (
                                                <TableRow key={order.id} className="transition-colors hover:bg-muted/30">
                                                    <TableCell className="px-5 py-3 font-mono text-xs text-foreground">{order.number}</TableCell>
                                                    <TableCell className="px-5 py-3 text-xs text-muted-foreground">{formatDateTime(order.placed_at)}</TableCell>
                                                    <TableCell className="px-5 py-3 text-center">
                                                        <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>{order.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                                                        <Money amount={order.total} currency={order.currency} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
