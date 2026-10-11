import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface PlanRow {
    id: number;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    features: string[];
    limits: Record<string, number | null>;
    is_active: boolean;
    subscriptions_count: number;
}

const input = 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm';

export default function PlatformPlans({ plans }: { plans: PlanRow[] }) {
    const [showForm, setShowForm] = useState(false);

    const form = useForm({
        name: '',
        slug: '',
        price_monthly: 0,
        price_yearly: 0,
        trial_days: 14,
        features: '' as string,
        limits_branches: '' as number | '',
        limits_users: '' as number | '',
        limits_orders: '' as number | '',
        is_active: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            name: data.name,
            slug: data.slug,
            price_monthly: data.price_monthly,
            price_yearly: data.price_yearly,
            trial_days: data.trial_days,
            features: data.features ? data.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
            limits: {
                branches: data.limits_branches === '' ? null : Number(data.limits_branches),
                users: data.limits_users === '' ? null : Number(data.limits_users),
                orders_this_month: data.limits_orders === '' ? null : Number(data.limits_orders),
            },
            is_active: data.is_active,
        }));
        form.post(route('platform.plans.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowForm(false);
            },
        });
    };

    return (
        <PlatformLayout title="Plans">
            <div className="flex justify-end">
                <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    {showForm ? 'Close' : 'New plan'}
                </button>
            </div>

            {showForm && (
                <div className="mt-4 rounded-lg bg-white p-6 shadow-sm">
                    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div><label className="text-xs text-gray-500">Name</label><input className={'block w-full ' + input} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required /></div>
                        <div><label className="text-xs text-gray-500">Slug</label><input className={'block w-full ' + input} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} required /></div>
                        <div><label className="text-xs text-gray-500">Trial days</label><input type="number" className={'block w-full ' + input} value={form.data.trial_days} onChange={(e) => form.setData('trial_days', Number(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500">Monthly price</label><input type="number" step="0.01" className={'block w-full ' + input} value={form.data.price_monthly} onChange={(e) => form.setData('price_monthly', Number(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500">Yearly price</label><input type="number" step="0.01" className={'block w-full ' + input} value={form.data.price_yearly} onChange={(e) => form.setData('price_yearly', Number(e.target.value))} /></div>
                        <div className="sm:col-span-3"><label className="text-xs text-gray-500">Features (comma separated)</label><input className={'block w-full ' + input} placeholder="pos, kitchen, reports" value={form.data.features} onChange={(e) => form.setData('features', e.target.value)} /></div>
                        <div><label className="text-xs text-gray-500">Branch limit (blank = unlimited)</label><input type="number" className={'block w-full ' + input} value={form.data.limits_branches} onChange={(e) => form.setData('limits_branches', e.target.value === '' ? '' : Number(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500">User limit</label><input type="number" className={'block w-full ' + input} value={form.data.limits_users} onChange={(e) => form.setData('limits_users', e.target.value === '' ? '' : Number(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500">Monthly order limit</label><input type="number" className={'block w-full ' + input} value={form.data.limits_orders} onChange={(e) => form.setData('limits_orders', e.target.value === '' ? '' : Number(e.target.value))} /></div>
                        <div className="sm:col-span-3">
                            <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                Create plan
                            </button>
                            {Object.values(form.errors)[0] && <span className="ml-3 text-sm text-red-600">{Object.values(form.errors)[0]}</span>}
                        </div>
                    </form>
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div key={plan.id} className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">{plan.name}</h2>
                            {!plan.is_active && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Inactive</span>}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                            <div>{plan.price_monthly.toFixed(2)}/mo · {plan.price_yearly.toFixed(2)}/yr</div>
                            <div className="text-xs text-gray-400">{plan.trial_days}-day trial · {plan.subscriptions_count} tenants</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                            {plan.features.map((f) => (
                                <span key={f} className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{f}</span>
                            ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            Branches: {plan.limits.branches ?? '∞'} · Users: {plan.limits.users ?? '∞'} · Orders/mo: {plan.limits.orders_this_month ?? '∞'}
                        </div>
                    </div>
                ))}
            </div>
        </PlatformLayout>
    );
}
