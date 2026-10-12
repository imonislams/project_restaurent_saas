import QrLayout from '@/Layouts/QrLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface ReceiptOrder {
    number: string;
    status: string;
    total: number;
    paid_total: number;
    placed_at: string | null;
    items: { name: string; quantity: number; line_total: number; modifiers: string[] }[];
}

interface Receipt {
    orders: ReceiptOrder[];
    subtotal: number;
    tax_total: number;
    service_charge: number;
    discount_total: number;
    total: number;
    paid_total: number;
    outstanding: number;
    currency: string;
    settled: boolean;
    closed_at: string | null;
}

interface ClosedProps {
    token: string;
    restaurant: { name: string; branch: string };
    table: { id: number; name: string };
    receipt: Receipt;
    feedback_enabled: boolean;
    feedback: { rating: number; comment: string | null } | null;
}

export default function QrClosed({ token, restaurant, table, receipt, feedback_enabled, feedback }: ClosedProps) {
    const [rating, setRating] = useState(feedback?.rating ?? 0);
    const [comment, setComment] = useState(feedback?.comment ?? '');
    const [submitted, setSubmitted] = useState(feedback !== null);
    const [busy, setBusy] = useState(false);
    const [starting, setStarting] = useState(false);

    const money = (n: number) => `${receipt.currency} ${Number(n || 0).toFixed(2)}`;

    const submitFeedback = async () => {
        if (rating < 1) return;
        setBusy(true);
        try {
            await window.axios.post(
                route('qr.feedback.store', { token }),
                { rating, comment: comment || null },
                { headers: { 'X-Dining-Participant': localStorage.getItem('qr_participant_token') ?? '' } },
            );
            setSubmitted(true);
        } finally {
            setBusy(false);
        }
    };

    const startNew = async () => {
        setStarting(true);
        try {
            const { data } = await window.axios.post(route('qr.session.start', { token }), {});
            if (data.participant_token) localStorage.setItem('qr_participant_token', data.participant_token);
            window.location.href = data.redirect;
        } catch {
            setStarting(false);
        }
    };

    return (
        <QrLayout restaurant={restaurant} tableName={table.name}>
            <Head title={`${restaurant.name} · Thank you`} />

            <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-card">
                <div className="text-3xl">🙏</div>
                <h1 className="mt-2 text-xl font-bold text-gray-900">Thank you for dining with us!</h1>
                <p className="mt-1 text-sm text-gray-500">We hope to see you again.</p>
                {receipt.settled && (
                    <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Bill settled
                    </p>
                )}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-subtle">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your receipt</p>
                <div className="mt-2 space-y-3">
                    {receipt.orders.map((order) => (
                        <div key={order.number} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-gray-800">{order.number}</span>
                                <span className="font-mono text-xs text-gray-600">{money(order.total)}</span>
                            </div>
                            <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                                {order.items.map((item, i) => (
                                    <li key={i}>
                                        {item.quantity}× {item.name}
                                        {item.modifiers.length > 0 && <span className="text-gray-400"> ({item.modifiers.join(', ')})</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <dl className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
                    <div className="flex justify-between text-gray-500"><dt>Subtotal</dt><dd className="font-mono">{money(receipt.subtotal)}</dd></div>
                    {receipt.discount_total > 0 && <div className="flex justify-between text-gray-500"><dt>Discount</dt><dd className="font-mono">-{money(receipt.discount_total)}</dd></div>}
                    <div className="flex justify-between text-gray-500"><dt>Tax</dt><dd className="font-mono">{money(receipt.tax_total)}</dd></div>
                    {receipt.service_charge > 0 && <div className="flex justify-between text-gray-500"><dt>Service charge</dt><dd className="font-mono">{money(receipt.service_charge)}</dd></div>}
                    <div className="flex justify-between border-t border-gray-100 pt-1 font-bold text-gray-900"><dt>Total</dt><dd className="font-mono">{money(receipt.total)}</dd></div>
                    <div className="flex justify-between text-gray-500"><dt>Paid</dt><dd className="font-mono">{money(receipt.paid_total)}</dd></div>
                </dl>
            </div>

            {feedback_enabled && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-subtle">
                    {submitted ? (
                        <p className="text-sm text-emerald-700">Thanks for your feedback! ⭐</p>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-gray-800">How was your experience?</p>
                            <div className="mt-2 flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`text-2xl ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
                                        aria-label={`${star} star`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={2}
                                placeholder="Anything to add? (optional)"
                                className="mt-2 w-full rounded-xl border-gray-300 text-sm focus:border-restrly-500 focus:ring-restrly-500"
                            />
                            <button
                                type="button"
                                disabled={rating < 1 || busy}
                                onClick={submitFeedback}
                                className="mt-2 h-10 w-full rounded-xl bg-restrly-600 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {busy ? 'Sending…' : 'Send feedback'}
                            </button>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={startNew}
                disabled={starting}
                className="mt-4 h-11 w-full rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 disabled:opacity-50"
            >
                {starting ? 'Starting…' : 'Start a new order'}
            </button>
        </QrLayout>
    );
}
