import Modal from '@/Components/Modal';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
    Tabs,
    TextField,
    SelectField,
    ConfirmDialog,
} from '@/Components/ui';
import type { BadgeTone, TabItem } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface Named {
    id: number;
    name: string;
}

interface Branch extends Named {}

interface Location {
    id: number;
    name: string;
    branch_id: number;
    branch_name: string | null;
}

interface Unit {
    id: number;
    name: string;
    code: string;
}

interface Ingredient {
    id: number;
    name: string;
    unit_id: number | null;
    unit_code: string | null;
    cost_per_unit: number;
    track_inventory: boolean;
    is_active: boolean;
}

interface Balance {
    id: number;
    branch_id?: number;
    stock_location_id?: number;
    item_id?: number;
    branch_name: string | null;
    location_name: string | null;
    item_type: string;
    item_name: string;
    quantity: number;
}

interface Movement {
    id: number;
    created_at: string | null;
    item_type: string;
    item_name: string;
    quantity_delta: number;
    reason: string;
    reason_label: string;
    location_name: string | null;
    note: string | null;
    user_name: string | null;
}

const REASON_TONES: Record<string, BadgeTone> = {
    opening: 'info',
    adjustment: 'warning',
    sale: 'neutral',
    waste: 'danger',
    transfer_in: 'success',
    transfer_out: 'warning',
    purchase: 'success',
    return: 'info',
};

const ADJUSTMENT_PRESETS = [
    'Routine cycle count',
    'Spoilage & expiration',
    'Kitchen breakage / spill',
    'Supplier invoice discrepancy',
    'Recipe yield variance',
    'End of month reconciliation',
];

export default function InventoryIndex({
    branches,
    locations,
    units,
    ingredients,
    products,
    balances,
    movements,
    allowNegative,
}: {
    branches: Branch[];
    locations: Location[];
    units: Unit[];
    ingredients: Ingredient[];
    products: Named[];
    balances: Balance[];
    movements: Movement[];
    allowNegative: boolean;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('inventory.manage');
    const canAdjust = auth.permissions.includes('inventory.adjust');

    const [activeTab, setActiveTab] = useState<'balances' | 'movements' | 'ingredients' | 'units'>('balances');

    // Filters for balances tab
    const [balanceSearch, setBalanceSearch] = useState('');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
    const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Filters for movements tab
    const [movementSearch, setMovementSearch] = useState('');
    const [movementReasonFilter, setMovementReasonFilter] = useState<string>('all');

    // Filters for ingredients tab
    const [ingredientSearch, setIngredientSearch] = useState('');

    // Modals
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [stockModalMode, setStockModalMode] = useState<'opening' | 'adjust'>('adjust');
    const [unitModalOpen, setUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', onConfirm: () => {} });

    // Stock movement form
    const stockForm = useForm({
        branch_id: (branches[0]?.id ?? '') as number | '',
        stock_location_id: '' as number | '',
        item_type: 'ingredient' as 'ingredient' | 'product',
        item_id: '' as number | '',
        quantity: 0,
        unit_cost: 0,
        note: '',
    });

    // Unit form
    const unitForm = useForm({
        name: '',
        code: '',
    });

    // Ingredient form
    const ingredientForm = useForm({
        name: '',
        unit_id: '' as number | '',
        cost_per_unit: 0,
        track_inventory: true,
        is_active: true,
    });

    // KPI Metrics calculation
    const totalValuation = useMemo(() => {
        const ingredientCostMap = new Map<string, number>();
        ingredients.forEach((i) => ingredientCostMap.set(`ingredient:${i.id}`, i.cost_per_unit));

        return balances.reduce((acc, b) => {
            const cost = ingredientCostMap.get(`${b.item_type}:${b.item_id}`) ?? 0;
            return acc + (cost > 0 && b.quantity > 0 ? cost * b.quantity : 0);
        }, 0);
    }, [balances, ingredients]);

    const lowStockCount = useMemo(() => {
        return balances.filter((b) => b.quantity <= 0).length;
    }, [balances]);

    // Available locations for the chosen branch in stockForm
    const formBranchLocations = useMemo(() => {
        if (!stockForm.data.branch_id) return [];
        return locations.filter((l) => l.branch_id === Number(stockForm.data.branch_id));
    }, [locations, stockForm.data.branch_id]);

    // Available items in stockForm
    const formItemOptions: Named[] = useMemo(() => {
        return stockForm.data.item_type === 'product' ? products : ingredients;
    }, [stockForm.data.item_type, products, ingredients]);

    // Current system balance for the selected item & location in stockForm
    const currentSystemBalance = useMemo(() => {
        if (!stockForm.data.stock_location_id || !stockForm.data.item_id) return null;
        const found = balances.find(
            (b) =>
                b.stock_location_id === Number(stockForm.data.stock_location_id) &&
                b.item_type === stockForm.data.item_type &&
                b.item_id === Number(stockForm.data.item_id)
        );
        return found ? found.quantity : 0;
    }, [balances, stockForm.data.stock_location_id, stockForm.data.item_type, stockForm.data.item_id]);

    // Calculated variance delta
    const adjustmentDelta = useMemo(() => {
        if (stockModalMode !== 'adjust' || currentSystemBalance === null) return null;
        return Number((Number(stockForm.data.quantity) - currentSystemBalance).toFixed(3));
    }, [stockModalMode, currentSystemBalance, stockForm.data.quantity]);

    // Filtered Balances
    const filteredBalances = useMemo(() => {
        return balances.filter((b) => {
            if (balanceSearch) {
                const q = balanceSearch.toLowerCase();
                const matchName = b.item_name.toLowerCase().includes(q);
                const matchBranch = b.branch_name?.toLowerCase().includes(q);
                const matchLoc = b.location_name?.toLowerCase().includes(q);
                if (!matchName && !matchBranch && !matchLoc) return false;
            }
            if (selectedBranchFilter !== 'all' && b.branch_name !== selectedBranchFilter) {
                return false;
            }
            if (selectedLocationFilter !== 'all' && b.location_name !== selectedLocationFilter) {
                return false;
            }
            if (lowStockOnly && b.quantity > 0) {
                return false;
            }
            return true;
        });
    }, [balances, balanceSearch, selectedBranchFilter, selectedLocationFilter, lowStockOnly]);

    // Filtered Movements
    const filteredMovements = useMemo(() => {
        return movements.filter((m) => {
            if (movementSearch) {
                const q = movementSearch.toLowerCase();
                const matchItem = m.item_name.toLowerCase().includes(q);
                const matchReason = m.reason_label.toLowerCase().includes(q);
                const matchUser = m.user_name?.toLowerCase().includes(q);
                const matchNote = m.note?.toLowerCase().includes(q);
                if (!matchItem && !matchReason && !matchUser && !matchNote) return false;
            }
            if (movementReasonFilter !== 'all' && m.reason !== movementReasonFilter) {
                return false;
            }
            return true;
        });
    }, [movements, movementSearch, movementReasonFilter]);

    // Filtered Ingredients
    const filteredIngredients = useMemo(() => {
        return ingredients.filter((i) => {
            if (!ingredientSearch) return true;
            const q = ingredientSearch.toLowerCase();
            return (
                i.name.toLowerCase().includes(q) ||
                (i.unit_code && i.unit_code.toLowerCase().includes(q))
            );
        });
    }, [ingredients, ingredientSearch]);

    // Open Stock Modal
    const handleOpenStockModal = (
        mode: 'opening' | 'adjust',
        prefill?: {
            branch_id?: number;
            stock_location_id?: number;
            item_type?: 'ingredient' | 'product';
            item_id?: number;
            current_qty?: number;
        }
    ) => {
        setStockModalMode(mode);
        const branchId = prefill?.branch_id ?? branches[0]?.id ?? '';
        const validLocations = locations.filter((l) => l.branch_id === Number(branchId));
        const locationId = prefill?.stock_location_id ?? validLocations[0]?.id ?? '';

        stockForm.setData({
            branch_id: branchId as number | '',
            stock_location_id: locationId as number | '',
            item_type: prefill?.item_type ?? 'ingredient',
            item_id: (prefill?.item_id ?? '') as number | '',
            quantity: mode === 'adjust' && prefill?.current_qty !== undefined ? prefill.current_qty : 0,
            unit_cost: 0,
            note: '',
        });
        setStockModalOpen(true);
    };

    const submitStockModal: FormEventHandler = (e) => {
        e.preventDefault();
        const routeName = stockModalMode === 'opening' ? 'inventory.opening' : 'inventory.adjust';

        stockForm.post(route(routeName), {
            preserveScroll: true,
            onSuccess: () => {
                setStockModalOpen(false);
                stockForm.reset();
            },
        });
    };

    // Unit handlers
    const handleSaveUnit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingUnit) {
            unitForm.patch(route('inventory.units.update', editingUnit.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setUnitModalOpen(false);
                    setEditingUnit(null);
                    unitForm.reset();
                },
            });
        } else {
            unitForm.post(route('inventory.units.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setUnitModalOpen(false);
                    unitForm.reset();
                },
            });
        }
    };

    const handleDeleteUnit = (unit: Unit) => {
        setDeleteConfirm({
            open: true,
            title: `Delete Unit "${unit.name}"?`,
            message: `Are you sure you want to remove unit (${unit.code})? Ingredients using this unit may be affected.`,
            onConfirm: () => {
                router.delete(route('inventory.units.destroy', unit.id), {
                    preserveScroll: true,
                    onSuccess: () => setDeleteConfirm((prev) => ({ ...prev, open: false })),
                });
            },
        });
    };

    // Ingredient handlers
    const handleSaveIngredient: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingIngredient) {
            ingredientForm.patch(route('inventory.ingredients.update', editingIngredient.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIngredientModalOpen(false);
                    setEditingIngredient(null);
                    ingredientForm.reset();
                },
            });
        } else {
            ingredientForm.post(route('inventory.ingredients.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setIngredientModalOpen(false);
                    ingredientForm.reset();
                },
            });
        }
    };

    const handleDeleteIngredient = (ingredient: Ingredient) => {
        setDeleteConfirm({
            open: true,
            title: `Delete Ingredient "${ingredient.name}"?`,
            message: `Are you sure you want to delete this ingredient? Existing recipe bills of materials referencing this item will lose their cost link.`,
            onConfirm: () => {
                router.delete(route('inventory.ingredients.destroy', ingredient.id), {
                    preserveScroll: true,
                    onSuccess: () => setDeleteConfirm((prev) => ({ ...prev, open: false })),
                });
            },
        });
    };

    const tabs: TabItem[] = [
        {
            key: 'balances',
            label: 'Stock on Hand',
            badge: balances.length,
        },
        {
            key: 'movements',
            label: 'Stock Ledger (Audit Trail)',
            badge: movements.length,
        },
        {
            key: 'ingredients',
            label: 'Ingredients Catalog',
            badge: ingredients.length,
        },
        {
            key: 'units',
            label: 'Units of Measure',
            badge: units.length,
        },
    ];

    const branchNames = useMemo(() => Array.from(new Set(branches.map((b) => b.name))), [branches]);
    const locationNames = useMemo(
        () => Array.from(new Set(locations.map((l) => l.name))),
        [locations]
    );

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Inventory & Stock Control"
                    description="Live branch balances, automated variance counts, ingredients catalog, and immutable movement ledger."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {allowNegative ? (
                                <Badge tone="warning">Negative Stock Permitted</Badge>
                            ) : (
                                <Badge tone="success">Negative Stock Blocked</Badge>
                            )}

                            {canAdjust && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleOpenStockModal('opening')}
                                    >
                                        + Record Opening
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleOpenStockModal('adjust')}
                                    >
                                        Physical Count / Adjust
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Inventory & Stock Control" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    {/* KPI Metrics */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Tracked Balances"
                            value={balances.length}
                            hint={`${ingredients.length} ingredients · ${products.length} products`}
                        />
                        <KpiCard
                            label="Depleted / Out of Stock"
                            value={lowStockCount}
                            tone={lowStockCount > 0 ? 'danger' : 'success'}
                            hint={lowStockCount > 0 ? 'Requires immediate restock' : 'All tracked stock positive'}
                        />
                        <KpiCard
                            label="Est. Stock Valuation"
                            value={`$${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            tone="neutral"
                            hint="Calculated from active ingredient unit costs"
                        />
                        <KpiCard
                            label="Ledger Movements"
                            value={movements.length}
                            hint="Last 100 recorded audit movements"
                        />
                    </div>

                    {/* Navigation Tabs */}
                    <Tabs
                        tabs={tabs}
                        value={activeTab}
                        onChange={(tabKey) => setActiveTab(tabKey as any)}
                    />

                    {/* TAB 1: STOCK ON HAND */}
                    {activeTab === 'balances' && (
                        <Card>
                            <CardHeader
                                title="Live Stock on Hand"
                                description="Real-time quantities aggregated by branch storage locations."
                                action={
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search items or locations…"
                                            value={balanceSearch}
                                            onChange={(e) => setBalanceSearch(e.target.value)}
                                            className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-64"
                                        />
                                        <select
                                            value={selectedBranchFilter}
                                            onChange={(e) => setSelectedBranchFilter(e.target.value)}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Branches</option>
                                            {branchNames.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedLocationFilter}
                                            onChange={(e) => setSelectedLocationFilter(e.target.value)}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Locations</option>
                                            {locationNames.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setLowStockOnly(!lowStockOnly)}
                                            className={`h-9 rounded-md px-3 text-xs font-medium transition ${
                                                lowStockOnly
                                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {lowStockOnly ? '✓ Depleted Only' : 'Show Depleted'}
                                        </button>
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredBalances.length === 0 ? (
                                    <EmptyState
                                        title="No Stock Balances Found"
                                        description={
                                            balanceSearch || lowStockOnly
                                                ? 'No items match your active filters. Clear filters to see all inventory.'
                                                : 'No inventory balances recorded yet. Record opening stock to begin tracking.'
                                        }
                                        action={
                                            canAdjust && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenStockModal('opening')}
                                                >
                                                    Record Opening Stock
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Item Name</th>
                                                    <th className="px-6 py-3.5">Category Type</th>
                                                    <th className="px-6 py-3.5">Branch</th>
                                                    <th className="px-6 py-3.5">Storage Location</th>
                                                    <th className="px-6 py-3.5 text-right">Available Qty</th>
                                                    <th className="px-6 py-3.5 text-center">Stock Status</th>
                                                    {canAdjust && (
                                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredBalances.map((b) => {
                                                    const isDepleted = b.quantity <= 0;
                                                    const isLow = b.quantity > 0 && b.quantity < 5;

                                                    return (
                                                        <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                                {b.item_name}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                                                                    {b.item_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600">
                                                                {b.branch_name ?? '—'}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600">
                                                                <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                    {b.location_name ?? 'General'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span
                                                                    className={`font-mono text-sm font-semibold tabular-nums ${
                                                                        isDepleted
                                                                            ? 'text-rose-600'
                                                                            : isLow
                                                                              ? 'text-amber-600'
                                                                              : 'text-gray-900'
                                                                    }`}
                                                                >
                                                                    {b.quantity.toFixed(3)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isDepleted ? (
                                                                    <Badge tone="danger">Depleted / Negative</Badge>
                                                                ) : isLow ? (
                                                                    <Badge tone="warning">Low Stock</Badge>
                                                                ) : (
                                                                    <Badge tone="success">Adequate</Badge>
                                                                )}
                                                            </td>
                                                            {canAdjust && (
                                                                <td className="px-6 py-4 text-right">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() =>
                                                                            handleOpenStockModal('adjust', {
                                                                                branch_id: b.branch_id,
                                                                                stock_location_id: b.stock_location_id,
                                                                                item_type: b.item_type as any,
                                                                                item_id: b.item_id,
                                                                                current_qty: b.quantity,
                                                                            })
                                                                        }
                                                                    >
                                                                        Adjust Count
                                                                    </Button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* TAB 2: STOCK LEDGER (MOVEMENTS) */}
                    {activeTab === 'movements' && (
                        <Card>
                            <CardHeader
                                title="Immutable Stock Movement Ledger"
                                description="Audit trail of every stock change, receipt, sale deduction, physical audit, and wastage."
                                action={
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search movement items, users, notes…"
                                            value={movementSearch}
                                            onChange={(e) => setMovementSearch(e.target.value)}
                                            className="h-9 w-60 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                        <select
                                            value={movementReasonFilter}
                                            onChange={(e) => setMovementReasonFilter(e.target.value)}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Movement Reasons</option>
                                            <option value="opening">Opening Stock</option>
                                            <option value="adjustment">Stock Count / Adjustment</option>
                                            <option value="sale">Sale Deduction</option>
                                            <option value="waste">Wastage / Spoilage</option>
                                            <option value="purchase">Purchase Receipt</option>
                                            <option value="transfer_in">Transfer In</option>
                                            <option value="transfer_out">Transfer Out</option>
                                            <option value="return">Return / Reversal</option>
                                        </select>
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredMovements.length === 0 ? (
                                    <EmptyState
                                        title="No Stock Movements Recorded"
                                        description="Transactions will appear here as stock is received, adjusted, or sold."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Timestamp</th>
                                                    <th className="px-6 py-3.5">Item</th>
                                                    <th className="px-6 py-3.5">Reason</th>
                                                    <th className="px-6 py-3.5">Location</th>
                                                    <th className="px-6 py-3.5 text-right">Delta Change</th>
                                                    <th className="px-6 py-3.5">Recorded By</th>
                                                    <th className="px-6 py-3.5">Audit Note</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredMovements.map((m) => {
                                                    const isPositive = m.quantity_delta > 0;
                                                    const isZero = m.quantity_delta === 0;

                                                    return (
                                                        <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                                                            <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                                                                {m.created_at
                                                                    ? new Date(m.created_at).toLocaleString()
                                                                    : '—'}
                                                            </td>
                                                            <td className="px-6 py-3.5 font-medium text-gray-900">
                                                                {m.item_name}
                                                                <span className="ml-1.5 text-xs text-gray-400">
                                                                    ({m.item_type})
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                <Badge tone={REASON_TONES[m.reason] ?? 'neutral'}>
                                                                    {m.reason_label}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-gray-600">
                                                                {m.location_name ?? '—'}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-right">
                                                                <span
                                                                    className={`font-mono text-sm font-semibold tabular-nums ${
                                                                        isZero
                                                                            ? 'text-gray-500'
                                                                            : isPositive
                                                                              ? 'text-emerald-600'
                                                                              : 'text-rose-600'
                                                                    }`}
                                                                >
                                                                    {isPositive ? `+${m.quantity_delta.toFixed(3)}` : m.quantity_delta.toFixed(3)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-xs text-gray-600">
                                                                {m.user_name ?? 'System'}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                                                                {m.note ?? '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* TAB 3: INGREDIENTS CATALOG */}
                    {activeTab === 'ingredients' && (
                        <Card>
                            <CardHeader
                                title="Ingredients Catalog"
                                description="Raw materials, prep items, units of measurement, and current unit costs."
                                action={
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Search ingredients…"
                                            value={ingredientSearch}
                                            onChange={(e) => setIngredientSearch(e.target.value)}
                                            className="h-9 w-52 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-64"
                                        />
                                        {canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setEditingIngredient(null);
                                                    ingredientForm.setData({
                                                        name: '',
                                                        unit_id: units[0]?.id ?? '',
                                                        cost_per_unit: 0,
                                                        track_inventory: true,
                                                        is_active: true,
                                                    });
                                                    setIngredientModalOpen(true);
                                                }}
                                            >
                                                + New Ingredient
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredIngredients.length === 0 ? (
                                    <EmptyState
                                        title="No Ingredients Found"
                                        description="Add raw ingredients to calculate recipe costs and track stock depletion."
                                        action={
                                            canManage && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingIngredient(null);
                                                        ingredientForm.reset();
                                                        setIngredientModalOpen(true);
                                                    }}
                                                >
                                                    Add First Ingredient
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Ingredient Name</th>
                                                    <th className="px-6 py-3.5">Standard Unit</th>
                                                    <th className="px-6 py-3.5 text-right">Cost Per Unit</th>
                                                    <th className="px-6 py-3.5 text-center">Track Stock</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    {canManage && (
                                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredIngredients.map((i) => (
                                                    <tr key={i.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {i.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">
                                                            <span className="font-mono text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/25">
                                                                {i.unit_code ?? 'None'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-900">
                                                            ${i.cost_per_unit.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {i.track_inventory ? (
                                                                <Badge tone="success">Tracked</Badge>
                                                            ) : (
                                                                <Badge tone="neutral">Untracked</Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {i.is_active ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                                    Archived
                                                                </span>
                                                            )}
                                                        </td>
                                                        {canManage && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => {
                                                                            setEditingIngredient(i);
                                                                            ingredientForm.setData({
                                                                                name: i.name,
                                                                                unit_id: i.unit_id ?? '',
                                                                                cost_per_unit: i.cost_per_unit,
                                                                                track_inventory: i.track_inventory,
                                                                                is_active: i.is_active,
                                                                            });
                                                                            setIngredientModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="danger"
                                                                        onClick={() => handleDeleteIngredient(i)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* TAB 4: UNITS OF MEASURE */}
                    {activeTab === 'units' && (
                        <Card>
                            <CardHeader
                                title="Units of Measurement"
                                description="Standard measurement units (Weight, Volume, Count) utilized in ingredient BOMs and stocking."
                                action={
                                    canManage && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setEditingUnit(null);
                                                unitForm.reset();
                                                setUnitModalOpen(true);
                                            }}
                                        >
                                            + New Unit
                                        </Button>
                                    )
                                }
                            />
                            <CardBody className="p-0">
                                {units.length === 0 ? (
                                    <EmptyState
                                        title="No Units Found"
                                        description="Add standard units like kg, grams, liters, or pieces."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Unit Name</th>
                                                    <th className="px-6 py-3.5">Short Code</th>
                                                    {canManage && (
                                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {units.map((u) => (
                                                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {u.name}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                                {u.code}
                                                            </span>
                                                        </td>
                                                        {canManage && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => {
                                                                            setEditingUnit(u);
                                                                            unitForm.setData({
                                                                                name: u.name,
                                                                                code: u.code,
                                                                            });
                                                                            setUnitModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="danger"
                                                                        onClick={() => handleDeleteUnit(u)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* MODAL: STOCK RECORDING & VARIANCE ADJUSTMENT */}
            <Modal
                show={stockModalOpen}
                maxWidth="lg"
                onClose={() => setStockModalOpen(false)}
            >
                <form onSubmit={submitStockModal} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {stockModalMode === 'opening'
                                    ? 'Record Initial Opening Stock'
                                    : 'Physical Stock Count & Variance Adjustment'}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500">
                                {stockModalMode === 'opening'
                                    ? 'Set the initial balance baseline for an item at a specific location.'
                                    : 'Enter the physically counted stock on shelf. The system records the variance delta.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStockModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Mode switcher */}
                    <div className="mt-4 flex rounded-lg bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => {
                                setStockModalMode('adjust');
                                stockForm.setData('unit_cost', 0);
                            }}
                            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                                stockModalMode === 'adjust'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Physical Count / Adjustment
                        </button>
                        <button
                            type="button"
                            onClick={() => setStockModalMode('opening')}
                            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                                stockModalMode === 'opening'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Initial Opening Balance
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Branch <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={stockForm.data.branch_id}
                                    onChange={(e) => {
                                        const newBranchId = Number(e.target.value);
                                        stockForm.setData({
                                            ...stockForm.data,
                                            branch_id: newBranchId,
                                            stock_location_id: '',
                                        });
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Location <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={stockForm.data.stock_location_id}
                                    onChange={(e) =>
                                        stockForm.setData(
                                            'stock_location_id',
                                            Number(e.target.value)
                                        )
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    <option value="">Select storage location…</option>
                                    {formBranchLocations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                                {stockForm.errors.stock_location_id && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {stockForm.errors.stock_location_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {/* Item Type */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Item Type
                                </label>
                                <select
                                    value={stockForm.data.item_type}
                                    onChange={(e) => {
                                        stockForm.setData({
                                            ...stockForm.data,
                                            item_type: e.target.value as 'ingredient' | 'product',
                                            item_id: '',
                                        });
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="ingredient">Ingredient</option>
                                    <option value="product">Sellable Product</option>
                                </select>
                            </div>

                            {/* Item Selection */}
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">
                                    Select Item <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={stockForm.data.item_id}
                                    onChange={(e) =>
                                        stockForm.setData('item_id', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    <option value="">Select an item…</option>
                                    {formItemOptions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                                {stockForm.errors.item_id && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {stockForm.errors.item_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Live System Comparison for Adjustment mode */}
                        {stockModalMode === 'adjust' && currentSystemBalance !== null && (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 text-xs text-primary">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-primary">
                                        Current System Stock:
                                    </span>
                                    <span className="font-mono font-bold text-sm text-primary">
                                        {currentSystemBalance.toFixed(3)}
                                    </span>
                                </div>
                                {adjustmentDelta !== null && (
                                    <div className="mt-2 flex items-center justify-between border-t border-primary/25 pt-2 font-medium">
                                        <span>Resulting Movement Delta:</span>
                                        <span
                                            className={`font-mono text-xs font-bold ${
                                                adjustmentDelta > 0
                                                    ? 'text-emerald-700'
                                                    : adjustmentDelta < 0
                                                      ? 'text-rose-700'
                                                      : 'text-gray-600'
                                            }`}
                                        >
                                            {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta}{' '}
                                            {adjustmentDelta > 0
                                                ? '(Surplus)'
                                                : adjustmentDelta < 0
                                                  ? '(Shrinkage / Loss)'
                                                  : '(Zero Variance)'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Quantity Input */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    {stockModalMode === 'opening'
                                        ? 'Opening Stock Quantity'
                                        : 'Physically Counted Quantity'}{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={stockForm.data.quantity}
                                    onChange={(e) =>
                                        stockForm.setData('quantity', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                />
                                {stockForm.errors.quantity && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {stockForm.errors.quantity}
                                    </p>
                                )}
                            </div>

                            {/* Unit Cost or Reason Preset */}
                            {stockModalMode === 'opening' ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        Unit Cost ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={stockForm.data.unit_cost}
                                        onChange={(e) =>
                                            stockForm.setData('unit_cost', Number(e.target.value))
                                        }
                                        className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        Audit Reason / Note
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Monthly stocktake"
                                        value={stockForm.data.note}
                                        onChange={(e) => stockForm.setData('note', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Preset chips for adjustment notes */}
                        {stockModalMode === 'adjust' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    Quick Reason Presets:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {ADJUSTMENT_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => stockForm.setData('note', preset)}
                                            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200 transition"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setStockModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={stockForm.processing}
                        >
                            {stockModalMode === 'opening'
                                ? 'Record Opening Stock'
                                : 'Apply Stock Adjustment'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: CREATE / EDIT INGREDIENT */}
            <Modal
                show={ingredientModalOpen}
                maxWidth="md"
                onClose={() => setIngredientModalOpen(false)}
            >
                <form onSubmit={handleSaveIngredient} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIngredientModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Ingredient Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Whole Milk, Mozzarella, Olive Oil"
                                value={ingredientForm.data.name}
                                onChange={(e) => ingredientForm.setData('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {ingredientForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">
                                    {ingredientForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Unit of Measure
                                </label>
                                <select
                                    value={ingredientForm.data.unit_id}
                                    onChange={(e) =>
                                        ingredientForm.setData(
                                            'unit_id',
                                            e.target.value ? Number(e.target.value) : ''
                                        )
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">No unit</option>
                                    {units.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Cost Per Unit ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={ingredientForm.data.cost_per_unit}
                                    onChange={(e) =>
                                        ingredientForm.setData(
                                            'cost_per_unit',
                                            Number(e.target.value)
                                        )
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={ingredientForm.data.track_inventory}
                                    onChange={(e) =>
                                        ingredientForm.setData('track_inventory', e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                                />
                                <span className="text-xs font-medium text-gray-700">
                                    Track inventory balance for this ingredient
                                </span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={ingredientForm.data.is_active}
                                    onChange={(e) =>
                                        ingredientForm.setData('is_active', e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                                />
                                <span className="text-xs font-medium text-gray-700">
                                    Active for recipe usage and purchasing
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIngredientModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={ingredientForm.processing}
                        >
                            {editingIngredient ? 'Update Ingredient' : 'Create Ingredient'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: CREATE / EDIT UNIT */}
            <Modal
                show={unitModalOpen}
                maxWidth="sm"
                onClose={() => setUnitModalOpen(false)}
            >
                <form onSubmit={handleSaveUnit} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingUnit ? 'Edit Unit' : 'New Unit of Measure'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setUnitModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Unit Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Kilogram, Liter, Piece"
                                value={unitForm.data.name}
                                onChange={(e) => unitForm.setData('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {unitForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{unitForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Short Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. kg, L, pcs, g"
                                value={unitForm.data.code}
                                onChange={(e) => unitForm.setData('code', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {unitForm.errors.code && (
                                <p className="mt-1 text-xs text-rose-600">{unitForm.errors.code}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setUnitModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={unitForm.processing}
                        >
                            {editingUnit ? 'Update Unit' : 'Save Unit'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE DIALOG */}
            <ConfirmDialog
                show={deleteConfirm.open}
                title={deleteConfirm.title}
                description={deleteConfirm.message}
                confirmLabel="Confirm Delete"
                tone="danger"
                onConfirm={deleteConfirm.onConfirm}
                onClose={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
