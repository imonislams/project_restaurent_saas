import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardContent } from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import KpiCard from '@/Components/ui/KpiCard';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/ui/PageHeader';
import {
    CheckboxField,
    SelectField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TextField,
    formatMoney,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    CheckCircle2,
    Layers,
    PackageCheck,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { FormEventHandler, useMemo, useRef, useState } from 'react';
import { cn } from '@/Components/ui/cn';

// --- Interfaces ---
interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    products_count: number;
}

interface Variant {
    id?: number;
    name: string;
    sku: string | null;
    price: number | null;
}

interface Product {
    id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    category_id: number | null;
    category_name: string | null;
    tax_category: string | null;
    price_dine_in: number;
    price_takeaway: number;
    price_delivery: number;
    cost_price: number;
    inventory_mode: string;
    is_active: boolean;
    is_available: boolean;
    labels: string[];
    sort_order: number;
    image_url?: string | null;
    variants: Variant[];
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    from?: number;
    to?: number;
}

export default function MenuIndex({
    categories,
    products,
    filters,
    inventoryModes,
}: {
    categories: Category[];
    products: Paginated<Product>;
    filters: { search: string; category_id: number | null };
    inventoryModes: { value: string; label: string }[];
}) {
    const { auth, flash, currency } = usePage().props as Record<string, any>;
    const canManage = auth?.permissions?.includes('menu.manage') ?? false;

    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>(
        filters.category_id ?? 'all',
    );
    const [editing, setEditing] = useState<Product | 'new' | null>(null);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
    const importRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const handleImport = (file: File | null) => {
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        setImporting(true);
        router.post(route('menu.products.import'), data, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setImporting(false);
                if (importRef.current) importRef.current.value = '';
            },
        });
    };

    const applyFilters = (overrides: Record<string, unknown> = {}) => {
        router.get(
            route('menu.index'),
            {
                search,
                category_id: selectedCategoryId === 'all' ? null : selectedCategoryId,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Quick Metrics
    const metrics = useMemo(() => {
        const total = products.total ?? products.data.length;
        const active = products.data.filter((p) => p.is_active).length;
        const available = products.data.filter((p) => p.is_available).length;
        const totalCategories = categories.length;
        return { total, active, available, totalCategories };
    }, [products, categories]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Menu & Products"
                    description="Configure restaurant catalog, multi-channel pricing, variants, and stock tracking."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" href={route('menu.products.template')}>
                                Template
                            </Button>
                            <Button variant="outline" size="sm" href={route('menu.products.export', { format: 'csv' })}>
                                Export CSV
                            </Button>
                            <Button variant="outline" size="sm" href={route('menu.products.export', { format: 'pdf' })}>
                                Export PDF
                            </Button>
                            {canManage && (
                                <>
                                    <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleImport(e.target.files?.[0] ?? null)} />
                                    <Button variant="outline" size="sm" disabled={importing} onClick={() => importRef.current?.click()}>
                                        {importing ? 'Importing…' : 'Import CSV'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setShowCategoriesModal(true)} icon={<Layers className="h-3.5 w-3.5" />}>
                                        Categories ({categories.length})
                                    </Button>
                                    <Button size="sm" onClick={() => setEditing('new')} icon={<Plus className="h-3.5 w-3.5" />}>
                                        New product
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Menu & Products" />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Alerts */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {flash?.import_result && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">Import result</span>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge tone="success">{flash.import_result.created} created</Badge>
                                        <Badge tone="info">{flash.import_result.updated} updated</Badge>
                                        {flash.import_result.skipped > 0 && <Badge tone="danger">{flash.import_result.skipped} skipped</Badge>}
                                        {flash.import_result.warnings?.length > 0 && <Badge tone="warning">{flash.import_result.warnings.length} image issue(s)</Badge>}
                                    </div>
                                </div>
                                {flash.import_result.errors?.length > 0 && (
                                    <ul className="mt-3 space-y-1 text-xs text-destructive">
                                        {flash.import_result.errors.slice(0, 10).map((error: string, index: number) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                )}
                                {flash.import_result.warnings?.length > 0 && (
                                    <ul className="mt-3 space-y-1 text-xs text-amber-700">
                                        {flash.import_result.warnings.slice(0, 10).map((warning: string, index: number) => (
                                            <li key={index}>{warning}</li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                        <KpiCard
                            title="Total Products"
                            value={metrics.total}
                            hint="Active & archived"
                            icon={<BookOpen className="h-4 w-4" />}
                        />
                        <KpiCard
                            title="Active Items"
                            value={metrics.active}
                            tone="success"
                            hint="Visible to staff"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                        />
                        <KpiCard
                            title="In Stock"
                            value={metrics.available}
                            tone="warning"
                            hint="Available on POS"
                            icon={<PackageCheck className="h-4 w-4" />}
                        />
                        <KpiCard
                            title="Categories"
                            value={metrics.totalCategories}
                            hint="Catalog groups"
                            icon={<Layers className="h-4 w-4" />}
                        />
                    </div>

                    {/* Filter & Search Bar */}
                    <Card className="shadow-xs border-border/80">
                        <CardContent className="p-3.5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        applyFilters();
                                    }}
                                    className="relative flex-1 max-w-md"
                                >
                                    <Search
                                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search by name, SKU, or barcode..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-2xs"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                applyFilters({ search: '' });
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </form>

                                <div className="text-xs text-muted-foreground">
                                    Showing <span className="font-semibold text-foreground">{products.total ?? products.data.length}</span> products
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 border-t border-border/60">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategoryId('all');
                                        applyFilters({ category_id: null });
                                    }}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0 cursor-pointer',
                                        selectedCategoryId === 'all'
                                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <span>All items</span>
                                    <span
                                        className={cn(
                                            'rounded px-1.5 py-0.2 text-[10px] font-bold',
                                            selectedCategoryId === 'all'
                                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                                : 'bg-background/80 text-muted-foreground'
                                        )}
                                    >
                                        {products.total ?? products.data.length}
                                    </span>
                                </button>
                                {categories.map((c) => {
                                    const isSelected = selectedCategoryId === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategoryId(c.id);
                                                applyFilters({ category_id: c.id });
                                            }}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <span>{c.name}</span>
                                            <span
                                                className={cn(
                                                    'rounded px-1.5 py-0.2 text-[10px] font-bold',
                                                    isSelected
                                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                                        : 'bg-background/80 text-muted-foreground'
                                                )}
                                            >
                                                {c.products_count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Products Data Table */}
                    <Card className="shadow-xs border-border/80 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3 bg-muted/20">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Product Catalog ({products.data.length} items on page)
                            </span>
                        </div>

                        {products.data.length === 0 ? (
                            <div className="py-16 text-center text-muted-foreground">
                                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                                <p className="text-sm font-semibold text-foreground">No products found</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Create your first menu item or change your category filter.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Dine-In</TableHead>
                                        <TableHead className="text-right">Takeaway</TableHead>
                                        <TableHead className="text-right">Delivery</TableHead>
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead>Stock Mode</TableHead>
                                        <TableHead>Status</TableHead>
                                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.data.map((product) => {
                                        return (
                                            <TableRow key={product.id}>
                                                {/* Product details */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {product.image_url ? (
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border"
                                                                aria-hidden="true"
                                                            >
                                                                <BookOpen className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-foreground">
                                                                {product.name}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                                                {product.sku && (
                                                                    <span className="font-mono bg-muted/80 border border-border/50 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground">
                                                                        {product.sku}
                                                                    </span>
                                                                )}
                                                                {product.variants.length > 0 && (
                                                                    <span className="text-primary font-medium">
                                                                        · {product.variants.length} variants
                                                                    </span>
                                                                )}
                                                                {product.labels.length > 0 && (
                                                                    <span>· {product.labels.join(', ')}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="text-foreground">
                                                    {product.category_name ? (
                                                        <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                                                            {product.category_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Uncategorized</span>
                                                    )}
                                                </TableCell>

                                                {/* Dine-In Price */}
                                                <TableCell className="text-right tabular-nums text-xs font-semibold text-foreground">
                                                    {formatMoney(product.price_dine_in, currency)}
                                                </TableCell>

                                                {/* Takeaway Price */}
                                                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                                    {formatMoney(product.price_takeaway, currency)}
                                                </TableCell>

                                                {/* Delivery Price */}
                                                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                                    {formatMoney(product.price_delivery, currency)}
                                                </TableCell>

                                                {/* Cost Price */}
                                                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                                    {product.cost_price > 0 ? formatMoney(product.cost_price, currency) : '—'}
                                                </TableCell>

                                                {/* Stock Tracking Mode */}
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {product.inventory_mode === 'none'
                                                            ? 'Untracked'
                                                            : product.inventory_mode === 'recipe'
                                                              ? 'Recipe (BOM)'
                                                              : 'Tracked Stock'}
                                                    </span>
                                                </TableCell>

                                                {/* Status Badges */}
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge tone={product.is_active ? 'success' : 'neutral'}>
                                                            {product.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        {!product.is_available && (
                                                            <span className="rounded bg-destructive/15 text-destructive px-1.5 py-0.5 text-[10px] font-semibold border border-destructive/20">
                                                                86 / Out of Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                {canManage && (
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-xs font-medium hover:bg-accent text-foreground"
                                                                onClick={() => setEditing(product)}
                                                            >
                                                                <Pencil className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => setPendingDelete(product)}
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </Card>

                    {/* Pagination */}
                    {products.links && products.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="text-xs text-muted-foreground">
                                Showing {products.from ?? 1} to {products.to ?? products.data.length} of {products.total ?? products.data.length} items
                            </div>
                            <div className="flex gap-1">
                                {products.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : link.url
                                                  ? 'border border-border bg-card text-foreground hover:bg-muted'
                                                  : 'opacity-40 cursor-not-allowed border border-border text-muted-foreground'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL 1: PRODUCT EDITOR --- */}
            {editing && canManage && (
                <ProductEditorModal
                    product={editing === 'new' ? null : editing}
                    categories={categories}
                    inventoryModes={inventoryModes}
                    onClose={() => setEditing(null)}
                />
            )}

            {/* --- MODAL 2: CATEGORY MANAGER --- */}
            {showCategoriesModal && canManage && (
                <CategoryManagerModal
                    categories={categories}
                    onClose={() => setShowCategoriesModal(false)}
                />
            )}

            {/* --- CONFIRM DELETE DIALOG --- */}
            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Delete Product "${pendingDelete?.name ?? ''}"?`}
                description="Products linked to existing sales orders cannot be removed. Are you sure you want to permanently delete this menu item?"
                confirmLabel="Delete product"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('menu.products.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onFinish: () => setPendingDelete(null),
                        });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}

// --- SUB-COMPONENTS ---

/**
 * Product Editor Modal
 */
function ProductEditorModal({
    product,
    categories,
    inventoryModes,
    onClose,
}: {
    product: Product | null;
    categories: Category[];
    inventoryModes: { value: string; label: string }[];
    onClose: () => void;
}) {
    const { currency } = usePage().props as Record<string, any>;
    const form = useForm({
        name: product?.name ?? '',
        category_id: product?.category_id ?? ('' as number | ''),
        sku: product?.sku ?? '',
        barcode: product?.barcode ?? '',
        tax_category: product?.tax_category ?? '',
        price_dine_in: product?.price_dine_in ?? 10,
        price_takeaway: product?.price_takeaway ?? 10,
        price_delivery: product?.price_delivery ?? 12,
        cost_price: product?.cost_price ?? 3,
        inventory_mode: product?.inventory_mode ?? 'none',
        is_active: product?.is_active ?? true,
        is_available: product?.is_available ?? true,
        sort_order: product?.sort_order ?? 0,
        labels: (product?.labels ?? []).join(', '),
        image: null as File | null,
        variants: (product?.variants ?? []).map((v) => ({
            name: v.name,
            sku: v.sku ?? '',
            price: v.price ?? '',
        })) as { name: string; sku: string; price: number | string }[],
    });

    // Gross margin preview calculation
    const grossMargin = useMemo(() => {
        const dineIn = Number(form.data.price_dine_in) || 0;
        const cost = Number(form.data.cost_price) || 0;
        if (dineIn <= 0 || cost <= 0) return null;
        const profit = dineIn - cost;
        const pct = Math.round((profit / dineIn) * 100);
        return { profit, pct };
    }, [form.data.price_dine_in, form.data.cost_price]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            labels: form.data.labels
                ? form.data.labels.split(',').map((l) => l.trim()).filter(Boolean)
                : [],
        };

        form.transform(() => payload);

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
            // Send multipart when a new product carries an image.
            forceFormData: Boolean(form.data.image),
        };

        if (product) {
            form.patch(route('menu.products.update', product.id), options);
        } else {
            form.post(route('menu.products.store'), options);
        }
    };

    const addVariant = () =>
        form.setData('variants', [
            ...form.data.variants,
            { name: '', sku: '', price: '' },
        ]);

    const updateVariant = (index: number, patch: Record<string, unknown>) => {
        form.setData(
            'variants',
            form.data.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
        );
    };

    return (
        <Modal show={true} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                        {product ? `Edit Product: ${product.name}` : 'Create New Menu Product'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="mt-4 space-y-4">
                    {product ? (
                        <ProductImageUploader product={product} />
                    ) : (
                        <ProductImageField
                            value={form.data.image}
                            error={form.errors.image}
                            onChange={(file) => form.setData('image', file)}
                        />
                    )}
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <TextField
                                label="Product name"
                                value={form.data.name}
                                onChange={(v) => form.setData('name', v)}
                                placeholder="e.g. Classic Wagyu Burger"
                                required
                                error={form.errors.name}
                            />
                        </div>

                        <SelectField
                            label="Category"
                            value={String(form.data.category_id ?? '')}
                            options={[{ value: '', label: 'Uncategorised' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                            onChange={(v) => form.setData('category_id', v ? Number(v) : '')}
                        />

                        <SelectField
                            label="Stock tracking mode"
                            value={form.data.inventory_mode}
                            options={inventoryModes}
                            onChange={(v) => form.setData('inventory_mode', v)}
                        />

                        <TextField
                            label="SKU / item code"
                            value={form.data.sku}
                            onChange={(v) => form.setData('sku', v)}
                            placeholder="e.g. BRG-001"
                            error={form.errors.sku}
                        />

                        <TextField
                            label="Barcode (EAN / UPC)"
                            value={form.data.barcode}
                            onChange={(v) => form.setData('barcode', v)}
                            placeholder="e.g. 501234567890"
                        />
                    </div>

                    {/* Multi-Channel Pricing Box */}
                    <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                Multi-Channel Pricing
                            </span>
                            {grossMargin && (
                                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    Gross Margin: {grossMargin.pct}% ({formatMoney(grossMargin.profit, currency)} profit)
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <TextField label="Dine-in price" type="number" value={String(form.data.price_dine_in)} onChange={(v) => form.setData('price_dine_in', Number(v))} required error={form.errors.price_dine_in} />
                            <TextField label="Takeaway price" type="number" value={String(form.data.price_takeaway)} onChange={(v) => form.setData('price_takeaway', Number(v))} required error={form.errors.price_takeaway} />
                            <TextField label="Delivery price" type="number" value={String(form.data.price_delivery)} onChange={(v) => form.setData('price_delivery', Number(v))} required error={form.errors.price_delivery} />
                            <TextField label="Cost price" type="number" value={String(form.data.cost_price)} onChange={(v) => form.setData('cost_price', Number(v))} error={form.errors.cost_price} />
                        </div>
                    </div>

                    <TextField
                        label="Labels & badges (comma separated)"
                        value={form.data.labels}
                        placeholder="e.g. Popular, Spicy, Chef Special, Vegan"
                        onChange={(v) => form.setData('labels', v)}
                    />

                    <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-muted/30 p-3">
                        <CheckboxField label="Active in catalog" checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} />
                        <CheckboxField label="Available on POS (in stock)" checked={form.data.is_available} onChange={(v) => form.setData('is_available', v)} />
                    </div>

                    {/* Product Variants Section */}
                    <div className="rounded-lg border border-border p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                                Product Variants &amp; Sizing ({form.data.variants.length})
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={addVariant}
                            >
                                + Add Variant
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {form.data.variants.map((variant, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        placeholder="Variant Name (e.g. Large, Double Patty)"
                                        className="h-8 flex-1 rounded-md border border-input bg-background py-1 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={variant.name}
                                        onChange={(e) => updateVariant(index, { name: e.target.value })}
                                    />
                                    <input
                                        placeholder="SKU suffix"
                                        className="h-8 w-28 rounded-md border border-input bg-background py-1 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={variant.sku}
                                        onChange={(e) => updateVariant(index, { sku: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Price override"
                                        className="h-8 w-28 rounded-md border border-input bg-background py-1 px-2.5 font-mono text-xs font-semibold text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={variant.price}
                                        onChange={(e) => updateVariant(index, { price: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'variants',
                                                form.data.variants.filter((_, i) => i !== index),
                                            )
                                        }
                                        className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-2 border-t border-border pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={form.processing}
                        >
                            {product ? 'Save Changes' : 'Create Product'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

/**
 * Category Manager Modal
 */
function CategoryManagerModal({
    categories,
    onClose,
}: {
    categories: Category[];
    onClose: () => void;
}) {
    const form = useForm({ name: '', sort_order: 0 });
    const [editingId, setEditingId] = useState<number | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId) {
            form.patch(route('menu.categories.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setEditingId(null);
                },
            });
        } else {
            form.post(route('menu.categories.store'), {
                preserveScroll: true,
                onSuccess: () => form.reset(),
            });
        }
    };

    return (
        <Modal show={true} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-base font-semibold text-foreground">Manage Menu Categories</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Add / Edit Category Form */}
                <form onSubmit={submit} className="mt-4 rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <span className="text-xs font-semibold text-foreground block">
                        {editingId ? 'Edit Category' : 'Add New Category'}
                    </span>
                    <div className="flex gap-2">
                        <input
                            placeholder="Category Name (e.g. Appetizers)"
                            className="h-8 flex-1 rounded-md border border-input bg-background py-1 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Sort order"
                            className="h-8 w-20 rounded-md border border-input bg-background py-1 px-2 text-xs font-mono font-medium text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                            value={form.data.sort_order}
                            onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            loading={form.processing}
                        >
                            {editingId ? 'Update' : 'Add'}
                        </Button>
                        {editingId && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    form.reset();
                                    setEditingId(null);
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                    {form.errors.name && (
                        <p className="text-xs text-destructive">{form.errors.name}</p>
                    )}
                </form>

                {/* Categories List */}
                <div className="mt-4 divide-y divide-border max-h-60 overflow-y-auto">
                    {categories.map((c) => (
                        <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                                <span className="font-semibold text-foreground">{c.name}</span>
                                <span className="ml-2 text-muted-foreground">
                                    ({c.products_count} items · Sort: {c.sort_order})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => {
                                        setEditingId(c.id);
                                        form.setData({ name: c.name, sort_order: c.sort_order });
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => {
                                        if (confirm(`Delete category "${c.name}"? Products in it will become uncategorized.`)) {
                                            router.delete(route('menu.categories.destroy', c.id), { preserveScroll: true });
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}

                    {categories.length === 0 && (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                            No categories created yet.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end border-t border-border pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Product image upload / replace / remove. Available once the product exists.
 */
function ProductImageUploader({ product }: { product: Product }) {
    const imageRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const form = useForm<{ image: File | null }>({ image: null });

    const pick = (file: File | null) => {
        form.setData('image', file);
        setPreview(file ? URL.createObjectURL(file) : null);
    };

    const upload = () => {
        form.post(route('menu.products.image', product.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setPreview(null);
                if (imageRef.current) imageRef.current.value = '';
            },
        });
    };

    const remove = () => router.delete(route('menu.products.image.destroy', product.id), { preserveScroll: true });

    const shown = preview ?? product.image_url ?? null;

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            {shown ? (
                <img src={shown} alt={product.name} className="h-14 w-14 rounded-lg object-cover ring-1 ring-border" />
            ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
                    No image
                </div>
            )}
            <div className="flex items-center gap-2">
                <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp" className="block text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-primary" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                <Button type="button" size="xs" onClick={upload} disabled={!form.data.image} loading={form.processing}>
                    Upload
                </Button>
                {product.image_url && !preview && (
                    <Button type="button" size="xs" variant="ghost" onClick={remove}>
                        Remove
                    </Button>
                )}
            </div>
            {form.errors.image && <p className="w-full text-xs text-destructive">{form.errors.image}</p>}
        </div>
    );
}

/**
 * Image picker for a product that does not exist yet — the file rides along with
 * the create request (multipart) instead of a separate upload endpoint.
 */
function ProductImageField({
    value,
    onChange,
    error,
}: {
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(value ? URL.createObjectURL(value) : null);

    const pick = (file: File | null) => {
        onChange(file);
        setPreview(file ? URL.createObjectURL(file) : null);
    };

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            {preview ? (
                <img src={preview} alt="Product" className="h-14 w-14 rounded-lg object-cover ring-1 ring-border" />
            ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
                    No image
                </div>
            )}
            <div className="flex items-center gap-2">
                <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                <Button type="button" size="xs" variant="secondary" onClick={() => ref.current?.click()}>
                    Choose image
                </Button>
                {preview && (
                    <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                            pick(null);
                            if (ref.current) ref.current.value = '';
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>
            {error && <p className="w-full text-xs text-destructive">{error}</p>}
        </div>
    );
}
