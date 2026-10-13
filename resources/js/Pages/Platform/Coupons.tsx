import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    ConfirmDialog,
    EmptyState,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatDate,
} from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Plus, Tag, Trash2, X } from 'lucide-react';

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

const inputClass =
    'h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs';

export default function PlatformCoupons({
    coupons,
    plans,
    currencies,
}: {
    coupons: CouponRow[];
    plans: Option[];
    currencies: Option[];
}) {
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
        <PlatformLayout
            title="Coupons & Promotions"
            description="Coupons apply promotional discounts to subscription invoices at creation or checkout."
            actions={
                <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                    {showForm ? (
                        <>
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Close Form
                        </>
                    ) : (
                        <>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New Coupon
                        </>
                    )}
                </Button>
            }
        >
            {showForm && (
                <Card className="mb-6 shadow-xs border-border/80">
                    <CardHeader title="Create Promotional Coupon" description="Configure code, discount value, limits, and eligible plans" />
                    <CardBody>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Coupon Code *</label>
                                <input
                                    className={`${inputClass} font-mono uppercase font-semibold`}
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                                    placeholder="e.g. SUMMER50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Discount Type</label>
                                <select
                                    className={inputClass}
                                    value={form.data.type}
                                    onChange={(e) => form.setData('type', e.target.value)}
                                >
                                    <option value="percent">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Discount Value *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`${inputClass} font-mono tabular-nums`}
                                    value={form.data.value}
                                    onChange={(e) => form.setData('value', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Currency (fixed only)</label>
                                <select
                                    className={inputClass}
                                    value={form.data.currency}
                                    onChange={(e) => form.setData('currency', e.target.value)}
                                >
                                    <option value="">— Any / Default —</option>
                                    {currencies.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.value}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Max Redemptions</label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.data.max_redemptions}
                                    onChange={(e) =>
                                        form.setData('max_redemptions', e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Eligible Plan</label>
                                <select
                                    className={inputClass}
                                    value={form.data.applies_to_plan_id}
                                    onChange={(e) => form.setData('applies_to_plan_id', e.target.value)}
                                >
                                    <option value="">All Subscription Plans</option>
                                    {plans.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Valid From</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={form.data.valid_from}
                                    onChange={(e) => form.setData('valid_from', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Valid To (Expiry)</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={form.data.valid_to}
                                    onChange={(e) => form.setData('valid_to', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Minimum Invoice Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={inputClass}
                                    value={form.data.min_amount}
                                    onChange={(e) =>
                                        form.setData('min_amount', e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Per-Tenant Usage Limit</label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={form.data.per_tenant_limit}
                                    onChange={(e) =>
                                        form.setData('per_tenant_limit', e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="1"
                                />
                            </div>
                            <div className="flex items-center gap-2 self-end pb-2">
                                <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring"
                                        checked={form.data.auto_apply}
                                        onChange={(e) => form.setData('auto_apply', e.target.checked)}
                                    />
                                    <span>Auto-apply when eligible</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 self-end pb-2">
                                <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring"
                                        checked={form.data.first_purchase_only}
                                        onChange={(e) => form.setData('first_purchase_only', e.target.checked)}
                                    />
                                    <span>First purchase only</span>
                                </label>
                            </div>
                            <div className="sm:col-span-4 flex items-center justify-between border-t border-border/60 pt-3">
                                {Object.values(form.errors)[0] ? (
                                    <span className="text-xs text-destructive">{Object.values(form.errors)[0]}</span>
                                ) : (
                                    <div />
                                )}
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" size="sm" loading={form.processing}>
                                        Save Coupon
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            <Card className="shadow-xs border-border/80 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-3 bg-muted/20">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Promotional Coupons ({coupons.length} total)
                    </span>
                </div>

                {coupons.length === 0 ? (
                    <EmptyState
                        title="No coupons yet"
                        description="Create a promotional coupon to offer discounts on subscription plans."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Coupon Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Plan Scope</TableHead>
                                <TableHead className="text-right">Redemptions</TableHead>
                                <TableHead>Valid Until</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-semibold text-foreground text-xs bg-muted/60 border border-border/50 px-2 py-0.5 rounded">
                                                {coupon.code}
                                            </span>
                                            {coupon.auto_apply && (
                                                <Badge tone="info" className="text-[10px]">
                                                    AUTO
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-foreground font-medium">
                                        {coupon.type === 'percent'
                                            ? `${coupon.value}% off`
                                            : `${coupon.currency ?? '$'}${coupon.value.toFixed(2)} off`}
                                        {coupon.min_amount !== null && (
                                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                                                (min ${coupon.min_amount})
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {coupon.applies_to ?? 'All plans'}
                                        {coupon.first_purchase_only && (
                                            <span className="ml-1.5 text-[11px] text-primary">· New customers only</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-semibold text-foreground">
                                        {coupon.redeemed_count}
                                        {coupon.max_redemptions !== null ? ` / ${coupon.max_redemptions}` : ''}
                                        {coupon.per_tenant_limit !== null && (
                                            <span className="ml-1 text-[11px] text-muted-foreground font-normal">
                                                ({coupon.per_tenant_limit}/tenant)
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDate(coupon.valid_to) || 'No expiration'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge tone={coupon.is_active ? 'success' : 'neutral'}>
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() =>
                                                    router.patch(
                                                        route('platform.coupons.update', coupon.id),
                                                        {
                                                            code: coupon.code,
                                                            type: coupon.type,
                                                            value: coupon.value,
                                                            is_active: !coupon.is_active,
                                                        },
                                                        { preserveScroll: true }
                                                    )
                                                }
                                                className="text-xs"
                                            >
                                                {coupon.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => setPendingDelete(coupon)}
                                                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="mr-1 h-3 w-3" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <ConfirmDialog
                show={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                title="Delete coupon"
                description={`Delete coupon "${pendingDelete?.code}"? It will no longer be redeemable.`}
                confirmLabel="Delete"
                tone="danger"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('platform.coupons.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onSuccess: () => setPendingDelete(null),
                        });
                    }
                }}
            />
        </PlatformLayout>
    );
}
