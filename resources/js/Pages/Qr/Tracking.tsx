import QrLayout from '@/Layouts/QrLayout';
import type { QrBranding } from '@/Components/Qr/qrBranding';
import { onPublic } from '@/realtime';
import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Step {
    key: string;
    label: string;
}

interface OrderStatus {
    key: string;
    label: string;
    index: number;
    steps: Step[];
    is_terminal: boolean;
}

interface TrackedOrder {
    id: number;
    number: string;
    status: OrderStatus;
    acceptance_status: string;
    status_value: string;
    total: number;
    paid_total: number;
    currency: string;
    placed_at: string | null;
    updated_at: string | null;
    items: { name: string; quantity: number; line_total: number; modifiers: string[] }[];
}

interface PaymentOption {
    provider: string;
    label: string;
    is_cash: boolean;
    is_default: boolean;
}

interface TrackingPayload {
    session: { id: number; status: string; billing_mode: string };
    orders: TrackedOrder[];
    totals: { outstanding: number; paid: number; currency: string };
    payment_options: PaymentOption[];
    bill: { requestable: boolean; request_open: boolean; request_status: string | null; requested_at: string | null };
    live_tracking: boolean;
    updated_at: string;
}

interface TrackingProps {
    token: string;
    restaurant: { name: string; branch: string; logo_url?: string | null };
    table: { id: number; name: string };
    branding?: Partial<QrBranding> | null;
    participant_token: string | null;
    initial: TrackingPayload;
}

const POLL_MS = 30000;

export default function QrTracking({ token, restaurant, table, branding, participant_token, initial }: TrackingProps) {
    const [data, setData] = useState<TrackingPayload>(initial);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [live, setLive] = useState(true);
    const [billBusy, setBillBusy] = useState(false);
    const [payingId, setPayingId] = useState<number | null>(null);
    const lastSync = useRef<number>(Date.now());

    const money = (n: number, currency = data.totals.currency) => `${currency} ${Number(n || 0).toFixed(2)}`;

    const onlineOptions = data.payment_options.filter((option) => !option.is_cash);

    const refresh = useCallback(async () => {
        try {
            const { data: fresh } = await window.axios.get(route('qr.status', { token }), {
                headers: { 'X-Dining-Participant': participant_token ?? '' },
            });
            setData(fresh);
            lastSync.current = Date.now();
            setSecondsAgo(0);
            setLive(true);
        } catch {
            setLive(false);
        }
    }, [token, participant_token]);

    useEffect(() => {
        if (!data.live_tracking) return;

        // Slow fallback; the socket below normally refreshes first.
        const poller = setInterval(refresh, POLL_MS);
        const ticker = setInterval(() => setSecondsAgo(Math.round((Date.now() - lastSync.current) / 1000)), 1000);

        return () => {
            clearInterval(poller);
            clearInterval(ticker);
        };
    }, [refresh, data.live_tracking]);

    // Live: an order moved or the payment landed — refresh now, not on the next poll.
    useEffect(() => {
        if (!data.live_tracking) return;

        return onPublic(`qr.${token}`, 'qr.updated', () => {
            void refresh();
        });
    }, [token, data.live_tracking, refresh]);

    const requestBill = async () => {
        setBillBusy(true);
        try {
            await window.axios.post(
                route('qr.bill.request', { token }),
                {},
                { headers: { 'X-Dining-Participant': participant_token ?? '' } },
            );
            const { data: fresh } = await window.axios.get(route('qr.status', { token }), {
                headers: { 'X-Dining-Participant': participant_token ?? '' },
            });
            setData(fresh);
        } finally {
            setBillBusy(false);
        }
    };

    const payNow = async (order: TrackedOrder, provider: string) => {
        setPayingId(order.id);
        try {
            const { data: res } = await window.axios.post(
                route('qr.payment.start', { token }),
                { order_id: order.id, provider, idempotency_key: `pay-${order.id}-${provider}-${Date.now()}` },
                { headers: { 'X-Dining-Participant': participant_token ?? '' } },
            );

            // Hosted gateways (Stripe / SSLCommerz / bKash) return a checkout URL
            // the customer must complete; confirmation happens server-side.
            const redirect = res?.payment?.redirect_url;
            if (redirect) {
                window.location.href = redirect;
                return;
            }

            const { data: fresh } = await window.axios.get(route('qr.status', { token }), {
                headers: { 'X-Dining-Participant': participant_token ?? '' },
            });
            setData(fresh);
        } finally {
            setPayingId(null);
        }
    };

    return (
        <QrLayout
            restaurant={restaurant}
            tableName={table.name}
            branding={branding}
            headerRight={
                <Link href={route('qr.menu', { token })} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                    Menu
                </Link>
            }
        >
            <Head title={`${restaurant.name} · Order status`} />

            <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">Your orders</span>
                <span className="flex items-center gap-1.5 text-gray-400">
                    <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {live ? `Live · updated ${secondsAgo}s ago` : 'Reconnecting…'}
                </span>
            </div>

            {data.orders.length === 0 && (
                <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-subtle">
                    You haven't placed an order yet.
                </div>
            )}

            <div className="space-y-3">
                {data.orders.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-white p-4 shadow-subtle">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-gray-900">{order.number}</span>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    order.status.key === 'cancelled' || order.status.key === 'rejected'
                                        ? 'bg-red-50 text-red-700'
                                        : order.status.key === 'completed'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-touchdine-50 text-touchdine-700'
                                }`}
                            >
                                {order.status.label}
                            </span>
                        </div>

                        {/* Progress timeline */}
                        {order.status.index >= 0 && (
                            <div className="mt-3 flex items-center">
                                {order.status.steps.map((step, i) => {
                                    const done = i <= order.status.index;
                                    return (
                                        <div key={step.key} className="flex flex-1 items-center last:flex-none">
                                            <div className="flex flex-col items-center">
                                                <span className={`h-3 w-3 rounded-full ${done ? 'bg-touchdine-600' : 'bg-gray-200'}`} />
                                                <span className={`mt-1 w-14 text-center text-[9px] font-semibold ${done ? 'text-touchdine-700' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </span>
                                            </div>
                                            {i < order.status.steps.length - 1 && (
                                                <div className={`mx-0.5 h-1 flex-1 rounded ${i < order.status.index ? 'bg-touchdine-600' : 'bg-gray-200'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
                            {order.items.map((item, i) => (
                                <li key={i} className="flex items-start justify-between gap-2">
                                    <span className="text-gray-700">
                                        <span className="font-semibold">{item.quantity}×</span> {item.name}
                                        {item.modifiers.length > 0 && (
                                            <span className="block text-[11px] text-gray-400">{item.modifiers.join(', ')}</span>
                                        )}
                                    </span>
                                    <span className="font-mono text-xs text-gray-500">{money(item.line_total, order.currency)}</span>
                                </li>
                            ))}
                        </ul>

                        {order.total - order.paid_total > 0.001 && order.status_value !== 'voided' && !order.status.is_terminal && (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        Outstanding {money(order.total - order.paid_total, order.currency)}
                                    </span>
                                </div>
                                {onlineOptions.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {onlineOptions.map((option) => (
                                            <button
                                                key={option.provider}
                                                type="button"
                                                onClick={() => payNow(order, option.provider)}
                                                disabled={payingId === order.id}
                                                className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                            >
                                                {payingId === order.id ? 'Processing…' : `Pay with ${option.label}`}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-[11px] text-gray-400">This restaurant collects payment at the counter.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {data.orders.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-subtle">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Outstanding</span>
                        <span className="font-mono font-bold text-gray-900">{money(data.totals.outstanding)}</span>
                    </div>

                    {data.bill.request_open ? (
                        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Bill requested — a member of staff will be with you shortly.
                        </div>
                    ) : data.bill.requestable ? (
                        <button
                            type="button"
                            onClick={requestBill}
                            disabled={billBusy || data.totals.outstanding <= 0}
                            className="mt-3 h-11 w-full rounded-xl bg-gray-900 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {billBusy ? 'Requesting…' : 'Pay at the counter — request the bill'}
                        </button>
                    ) : null}
                </div>
            )}
        </QrLayout>
    );
}
