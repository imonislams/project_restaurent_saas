import Icon from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardBody, CardHeader } from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import Drawer from '@/Components/ui/Drawer';
import EmptyState from '@/Components/ui/EmptyState';
import { CheckboxField, SelectField, TextField } from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface ModifierOption {
    id?: number;
    name: string;
    sku: string | null;
    price_delta: number;
    is_default: boolean;
    is_active: boolean;
}

interface ModifierGroup {
    id: number;
    name: string;
    selection_type: string;
    min_select: number;
    max_select: number;
    is_required: boolean;
    sort_order: number;
    is_active: boolean;
    product_ids: number[];
    options: ModifierOption[];
}

interface ProductOption {
    id: number;
    name: string;
}

interface GroupForm {
    id: number | null;
    name: string;
    selection_type: string;
    min_select: number;
    max_select: number;
    is_required: boolean;
    is_active: boolean;
    sort_order: number;
    products: number[];
    options: ModifierOption[];
}

const emptyGroup = (): GroupForm => ({
    id: null,
    name: '',
    selection_type: 'single',
    min_select: 0,
    max_select: 1,
    is_required: false,
    is_active: true,
    sort_order: 0,
    products: [],
    options: [{ name: '', sku: null, price_delta: 0, is_default: false, is_active: true }],
});

const money = (n: number) => `+$${Number(n || 0).toFixed(2)}`;

export default function ModifiersIndex({
    groups,
    products,
    selectionTypes,
}: {
    groups: ModifierGroup[];
    products: ProductOption[];
    selectionTypes: { value: string; label: string }[];
}) {
    const { auth } = usePage().props as Record<string, any>;
    const canManage = auth?.permissions?.includes('modifiers.manage') ?? false;

    const [editing, setEditing] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ModifierGroup | null>(null);

    const form = useForm<GroupForm>(emptyGroup());

    const openCreate = () => {
        form.setData(emptyGroup());
        form.clearErrors();
        setEditing(true);
    };

    const openEdit = (group: ModifierGroup) => {
        form.setData({
            id: group.id,
            name: group.name,
            selection_type: group.selection_type,
            min_select: group.min_select,
            max_select: group.max_select,
            is_required: group.is_required,
            is_active: group.is_active,
            sort_order: group.sort_order,
            products: group.product_ids,
            options: group.options.map((option) => ({ ...option })),
        });
        form.clearErrors();
        setEditing(true);
    };

    const submit = () => {
        if (form.data.id) {
            form.patch(route('modifiers.groups.update', form.data.id), {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
            });
        } else {
            form.post(route('modifiers.groups.store'), {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
            });
        }
    };

    const setOption = (index: number, patch: Partial<ModifierOption>) => {
        const options = form.data.options.map((option, i) => (i === index ? { ...option, ...patch } : option));
        form.setData('options', options);
    };

    const addOption = () =>
        form.setData('options', [
            ...form.data.options,
            { name: '', sku: null, price_delta: 0, is_default: false, is_active: true },
        ]);

    const removeOption = (index: number) =>
        form.setData('options', form.data.options.filter((_, i) => i !== index));

    const toggleProduct = (id: number, checked: boolean) =>
        form.setData('products', checked ? [...form.data.products, id] : form.data.products.filter((p) => p !== id));

    const confirmDelete = () => {
        if (!pendingDelete) return;
        form.delete(route('modifiers.groups.destroy', pendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Modifiers & Add-ons"
                    description="Reusable option groups — sizes, extras, cooking preferences — attached to products and priced per order line."
                    actions={
                        canManage ? (
                            <Button size="sm" onClick={openCreate}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                New group
                            </Button>
                        ) : undefined
                    }
                />
            }
        >
            <Head title="Modifiers" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {groups.length === 0 ? (
                        <Card>
                            <CardBody>
                                <EmptyState
                                    title="No modifier groups yet"
                                    description="Create a group like “Size” or “Extras”, add its options, then attach it to products."
                                    action={canManage ? <Button onClick={openCreate}>Create group</Button> : undefined}
                                />
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {groups.map((group) => (
                                <Card key={group.id}>
                                    <CardHeader
                                        title={group.name}
                                        description={
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <Badge tone="brand">
                                                    {group.selection_type === 'single' ? 'Single choice' : 'Multiple choice'}
                                                </Badge>
                                                {group.is_required && <Badge tone="warning">Required</Badge>}
                                                {!group.is_active && <Badge tone="neutral">Inactive</Badge>}
                                            </span>
                                        }
                                    />
                                    <CardBody className="space-y-3">
                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Options ({group.options.length})
                                            </p>
                                            <ul className="space-y-1 text-sm text-foreground">
                                                {group.options.map((option) => (
                                                    <li key={option.id} className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{option.name}</span>
                                                        <span className="tabular-nums text-xs text-muted-foreground">
                                                            {Number(option.price_delta) === 0 ? 'Free' : money(option.price_delta)}
                                                        </span>
                                                    </li>
                                                ))}
                                                {group.options.length === 0 && (
                                                    <li className="text-xs text-muted-foreground">No options yet.</li>
                                                )}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Products
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {group.product_ids.length === 0
                                                    ? 'Not attached to any product.'
                                                    : `${group.product_ids.length} product(s)`}
                                            </p>
                                        </div>
                                    </CardBody>
                                    {canManage && (
                                        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                                            <Button variant="secondary" size="sm" onClick={() => openEdit(group)}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setPendingDelete(group)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Drawer
                show={editing}
                onClose={() => setEditing(false)}
                title={form.data.id ? 'Edit modifier group' : 'New modifier group'}
                width="max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submit} loading={form.processing}>
                            {form.data.id ? 'Save changes' : 'Create group'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <TextField
                        label="Group name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={form.errors.name}
                        placeholder="e.g. Size, Extras, Cooking preference"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <SelectField
                            label="Selection type"
                            value={form.data.selection_type}
                            options={selectionTypes}
                            onChange={(v) => form.setData('selection_type', v)}
                            error={form.errors.selection_type}
                        />
                        <TextField
                            label="Sort order"
                            type="number"
                            value={String(form.data.sort_order)}
                            onChange={(v) => form.setData('sort_order', Number(v) || 0)}
                            error={form.errors.sort_order}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <TextField
                            label="Minimum selections"
                            type="number"
                            value={String(form.data.min_select)}
                            onChange={(v) => form.setData('min_select', Number(v) || 0)}
                            error={form.errors.min_select}
                        />
                        <TextField
                            label="Maximum selections"
                            type="number"
                            value={String(form.data.max_select)}
                            onChange={(v) => form.setData('max_select', Number(v) || 1)}
                            error={form.errors.max_select}
                            hint={form.data.selection_type === 'single' ? 'Single-choice groups allow one.' : undefined}
                        />
                    </div>

                    <div className="flex flex-wrap gap-5">
                        <CheckboxField
                            label="Required"
                            checked={form.data.is_required}
                            onChange={(v) => form.setData('is_required', v)}
                        />
                        <CheckboxField
                            label="Active"
                            checked={form.data.is_active}
                            onChange={(v) => form.setData('is_active', v)}
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Options</span>
                            <Button variant="ghost" size="xs" onClick={addOption} icon={<Icon name="plus" className="h-3.5 w-3.5" />}>
                                Add option
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {form.data.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <TextField
                                        className="flex-1"
                                        value={option.name}
                                        onChange={(v) => setOption(index, { name: v })}
                                        placeholder="Option name"
                                        error={(form.errors as Record<string, string>)[`options.${index}.name`]}
                                    />
                                    <TextField
                                        className="w-28"
                                        type="number"
                                        value={String(option.price_delta)}
                                        onChange={(v) => setOption(index, { price_delta: Number(v) || 0 })}
                                        placeholder="0.00"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                                        aria-label="Remove option"
                                    >
                                        <Icon name="trash" className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="mb-2 block text-xs font-medium text-gray-600">Attach to products</span>
                        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-3">
                            {products.length === 0 && <p className="text-xs text-gray-400">No products yet.</p>}
                            {products.map((product) => (
                                <CheckboxField
                                    key={product.id}
                                    label={product.name}
                                    checked={form.data.products.includes(product.id)}
                                    onChange={(v) => toggleProduct(product.id, v)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Drawer>

            <ConfirmDialog
                show={pendingDelete !== null}
                title="Delete modifier group?"
                description={`“${pendingDelete?.name ?? ''}” will be removed and detached from all products.`}
                confirmLabel="Delete"
                processing={form.processing}
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
