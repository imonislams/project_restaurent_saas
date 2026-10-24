import QrLayout from '@/Layouts/QrLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface EntryProps {
    token: string;
    restaurant: { name: string; branch: string; logo_url?: string | null };
    table: { id: number; name: string };
    enabled: boolean;
    policy: { guest_checkout: boolean; require_phone: boolean; require_email: boolean };
}

export default function QrEntry({ token, restaurant, table, enabled, policy }: EntryProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const start = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data } = await window.axios.post(route('qr.session.start', { token }), {
                name: name || null,
                phone: phone || null,
                email: email || null,
            });
            if (data.participant_token) {
                localStorage.setItem('qr_participant_token', data.participant_token);
            }
            window.location.href = data.redirect;
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            const first = Object.values(err?.response?.data?.errors ?? {})[0];
            setError(err?.response?.data?.message ?? (Array.isArray(first) ? first[0] : undefined) ?? 'Could not start your session. Please try again.');
            setLoading(false);
        }
    };

    return (
        <QrLayout restaurant={restaurant} tableName={table.name}>
            <Head title={`${restaurant.name} · Table ${table.name}`} />

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
                <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-touchdine-600">Welcome</p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">{restaurant.name}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {restaurant.branch} · Table {table.name}
                    </p>
                </div>

                {!enabled ? (
                    <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        QR ordering is currently unavailable for this restaurant. Please ask a member of staff for help.
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            Browse the menu and order from your phone — no app required.
                        </p>

                        {!policy.guest_checkout && (
                            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                This restaurant asks guests to leave contact details before ordering.
                            </div>
                        )}

                        <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-600">Your name (optional)</span>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-touchdine-500 focus:ring-touchdine-500"
                                placeholder="e.g. Alex"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-600">
                                Phone {policy.require_phone ? <span className="text-red-500">*</span> : '(optional)'}
                            </span>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                inputMode="tel"
                                className="h-11 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-touchdine-500 focus:ring-touchdine-500"
                                placeholder="Phone number"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-600">
                                Email {policy.require_email ? <span className="text-red-500">*</span> : '(optional)'}
                            </span>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="h-11 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-touchdine-500 focus:ring-touchdine-500"
                                placeholder="you@example.com"
                            />
                        </label>

                        {error && (
                            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                        )}

                        <button
                            type="button"
                            onClick={start}
                            disabled={loading}
                            className="h-12 w-full rounded-xl bg-touchdine-600 text-sm font-bold text-white shadow-card transition hover:bg-touchdine-700 active:scale-[0.99] disabled:opacity-60"
                        >
                            {loading ? 'Starting…' : 'Start dining'}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">Scan. Order. Enjoy.</p>
        </QrLayout>
    );
}
