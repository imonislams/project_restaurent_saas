import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, formatDate } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface CouponRow {
    id: number;
    code: string;
    type: string;
    type_label: string;
    value: number;
    currency: string | null;
    max_redemptions: number | null;
    redeemed_count: number;
    redemptions_count: number;
    applies_to: string | null;
    valid_from: string | null;
    valid_to: string | null;
    is_active: boolean;
    auto_apply: boolean;
    first_purchase_only: boolean;
    min_amount: number | null;
    per_tenant_limit: number | null;
}

interface Option {
    value: string;
    label: string;
}

const input = 'block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400';

export default function PlatformCoupons({ coupons, plans, currencies }: { coupons: CouponRow[]; plans: Option[]; currencies: Option[] }) {
    const [showForm, setShowForm] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<CouponRow | null>(null);

    const form = useForm({
        code: '',
        type: 'percent',
        value: 10,
        currency: '',
        max_redemptions: '' as number | '',
        applies_to_plan_id: '',
        valid_from: '',
        valid_to: '',
        auto_apply: false,
        first_purchase_only: false,
        min_amount: '' as number | '',
        per_tenant_limit: '' as number | '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            code: data.code,
            type: data.type,
            value: data.value,
            currency: data.currency || null,
            max_redemptions: data.max_redemptions === '' ? null : Number(data.max_redemptions),
            applies_to_plan_id: data.applies_to_plan_id === '' ? null : Number(data.applies_to_plan_id),
            valid_from: data.valid_from || null,
            valid_to: data.valid_to || null,
            auto_apply: data.auto_apply,
            first_purchase_only: data.first_purchase_only,
            min_amount: data.min_amount === '' ? null : Number(data.min_amount),
            per_tenant_limit: data.per_tenant_limit === '' ? null : Number(data.per_tenant_limit),
        }));
        form.post(route('platform.coupons.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowForm(false);
            },
        });
    };

    return (
        <PlatformLayout title="Coupons & Promotions">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Coupons apply a discount to subscription invoices at issuance.</p>
                <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                    {showForm ? 'Close' : 'New coupon'}
                </Button>
            </div>

            {showForm && (
                <Card className="mb-4">
                    <CardHeader title="New coupon" />
                    <CardBody>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <label className="block">
                                <span className="text-xs text-gray-500">Code</span>
                                <input className={input} value={form.data.code} onChange={(e) => form.setData('code', e.target.value.toUpperCase())} required />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Type</span>
                                <select className={input} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                    <option value="percent">Percentage</option>
                                    <option value="fixed">Fixed amount</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Value</span>
                                <input type="number" step="0.01" className={input} value={form.data.value} onChange={(e) => form.setData('value', Number(e.target.value))} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Currency (fixed only)</span>
                                <select className={input} value={form.data.currency} onChange={(e) => form.setData('currency', e.target.value)}>
                                    <option value="">—</option>
                                    {currencies.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Max redemptions</span>
                                <input type="number" className={input} value={form.data.max_redemptions} onChange={(e) => form.setData('max_redemptions', e.target.value === '' ? '' : Number(e.target.value))} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Applies to plan</span>
                                <select className={input} value={form.data.applies_to_plan_id} onChange={(e) => form.setData('applies_to_plan_id', e.target.value)}>
                                    <option value="">All plans</option>
                                    {plans.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Valid from</span>
                                <input type="date" className={input} value={form.data.valid_from} onChange={(e) => form.setData('valid_from', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Valid to</span>
                                <input type="date" className={input} value={form.data.valid_to} onChange={(e) => form.setData('valid_to', e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Minimum amount</span>
                                <input type="number" step="0.01" className={input} value={form.data.min_amount} onChange={(e) => form.setData('min_amount', e.target.value === '' ? '' : Number(e.target.value))} />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-500">Per-tenant limit</span>
                                <input type="number" className={input} value={form.data.per_tenant_limit} onChange={(e) => form.setData('per_tenant_limit', e.target.value === '' ? '' : Number(e.target.value))} />
                            </label>
                            <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
                                <input type="checkbox" className="rounded border-gray-300" checked={form.data.auto_apply} onChange={(e) => form.setData('auto_apply', e.target.checked)} />
                                Auto-apply when eligible
                            </label>
                            <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
                                <input type="checkbox" className="rounded border-gray-300" checked={form.data.first_purchase_only} onChange={(e) => form.setData('first_purchase_only', e.target.checked)} />
                                First purchase only
                            </label>
                            <div className="sm:col-span-4">
                                <Button type="submit" size="sm" loading={form.processing}>
                                    Create coupon
                                </Button>
                                {Object.values(form.errors)[0] && <span className="ml-3 text-sm text-red-600">{Object.values(form.errors)[0]}</span>}
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            <Card>
                {coupons.length === 0 ? (
                    <EmptyState title="No coupons yet" description="Create a coupon to offer promotions on subscription plans." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-2">Code</th>
                                    <th className="px-4 py-2">Discount</th>
                                    <th className="px-4 py-2">Applies to</th>
                                    <th className="px-4 py-2 text-right">Redeemed</th>
                                    <th className="px-4 py-2">Valid until</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono font-medium text-gray-800">
                                            {coupon.code}
                                            {coupon.auto_apply && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">AUTO</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {coupon.type === 'percent' ? `${coupon.value}%` : `${coupon.currency ?? ''} ${coupon.value.toFixed(2)}`}
                                            {coupon.min_amount !== null && <span className="ml-2 text-[11px] text-gray-400">min {coupon.min_amount}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {coupon.applies_to ?? 'All plans'}
                                            {coupon.first_purchase_only && <span className="ml-2 text-[11px] text-gray-400">first only</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {coupon.redeemed_count}
                                            {coupon.max_redemptions !== null ? ` / ${coupon.max_redemptions}` : ''}
                                            {coupon.per_tenant_limit !== null && <span className="ml-1 text-[11px] text-gray-400">({coupon.per_tenant_limit}/tenant)</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(coupon.valid_to)}</td>
                                        <td className="px-4 py-3">
                                            <Badge tone={coupon.is_active ? 'success' : 'neutral'}>{coupon.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => router.patch(route('platform.coupons.update', coupon.id), { code: coupon.code, type: coupon.type, value: coupon.value, is_active: !coupon.is_active }, { preserveScroll: true })}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                            >
                                                {coupon.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => setPendingDelete(coupon)} className="ml-3 text-xs font-medium text-red-600 hover:text-red-700">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Delete coupon ${pendingDelete?.code}?`}
                description="Coupons with redemptions are deactivated instead of deleted to preserve the redemption history."
                confirmLabel="Delete coupon"
                onConfirm={() => {
                    if (pendingDelete) router.delete(route('platform.coupons.destroy', pendingDelete.id), { preserveScroll: true, onFinish: () => setPendingDelete(null) });
                }}
                onClose={() => setPendingDelete(null)}
            />
        </PlatformLayout>
    );
}
