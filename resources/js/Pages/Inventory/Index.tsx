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
    Pagination,
    Tabs,
    TextField,
    SelectField,
    ConfirmDialog,
    formatMoney,
} from '@/Components/ui';
import type { PageLink, TabItem } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrintDocument from '@/Components/print/PrintDocument';
import StockBalancesTable from './Partials/StockBalancesTable';
import type { StockBalanceRow } from './Partials/StockBalancesTable';
import StockMovementsTable from './Partials/StockMovementsTable';
import type { StockMovementRow } from './Partials/StockMovementsTable';
import IngredientsTable from './Partials/IngredientsTable';
import type { IngredientRow } from './Partials/IngredientsTable';
import UnitsTable from './Partials/UnitsTable';
import type { UnitRow } from './Partials/UnitsTable';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

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

type Unit = UnitRow;
type Ingredient = IngredientRow;
type Balance = StockBalanceRow;
type Movement = StockMovementRow;

interface Paginator<T> {
    data: T[];
    links: PageLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
}

type InventoryTab = 'balances' | 'movements' | 'ingredients' | 'units';

interface InventoryFilters {
    search: string;
    branch_id: number | null;
    location_id: number | null;
    depleted: boolean;
    movement_search: string;
    movement_reason: string;
    ingredient_search: string;
    per_page: number;
}

const ADJUSTMENT_PRESETS = [
    'Routine cycle count',
    'Spoilage & expiration',
    'Kitchen breakage / spill',
    'Supplier invoice discrepancy',
    'Recipe yield variance',
    'End of month reconciliation',
];

export default function InventoryIndex({
    tab,
    branches,
    locations,
    units,
    unitOptions,
    ingredients,
    ingredientOptions,
    products,
    balances,
    balanceStats,
    inventoryFilters,
    movements,
    allowNegative,
}: {
    tab: InventoryTab;
    branches: Branch[];
    locations: Location[];
    units: Paginator<Unit>;
    unitOptions: Unit[];
    ingredients: Paginator<Ingredient>;
    ingredientOptions: Named[];
    products: Named[];
    balances: Paginator<Balance>;
    balanceStats: { depleted: number; valuation: number };
    inventoryFilters: InventoryFilters;
    movements: Paginator<Movement>;
    allowNegative: boolean;
}) {
    const { auth, flash, currency } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('inventory.manage');
    const canAdjust = auth.permissions.includes('inventory.adjust');

    const [activeTab, setActiveTab] = useState<InventoryTab>(tab ?? 'balances');

    // Filters for balances tab (server-side; seeded from the URL-backed filters prop)
    const [balanceSearch, setBalanceSearch] = useState(inventoryFilters.search ?? '');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(
        inventoryFilters.branch_id ? String(inventoryFilters.branch_id) : 'all'
    );
    const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>(
        inventoryFilters.location_id ? String(inventoryFilters.location_id) : 'all'
    );
    const [lowStockOnly, setLowStockOnly] = useState(Boolean(inventoryFilters.depleted));

    // Filters for movements tab
    const [movementSearch, setMovementSearch] = useState(inventoryFilters.movement_search ?? '');
    const [movementReasonFilter, setMovementReasonFilter] = useState<string>(
        inventoryFilters.movement_reason || 'all'
    );

    // Filters for ingredients tab
    const [ingredientSearch, setIngredientSearch] = useState(inventoryFilters.ingredient_search ?? '');

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

    // Live system stock for the item/location selected in the adjust modal.
    const [stockCurrentQty, setStockCurrentQty] = useState<number | null>(null);

    // Available locations for the chosen branch in stockForm
    const formBranchLocations = useMemo(() => {
        if (!stockForm.data.branch_id) return [];
        return locations.filter((l) => l.branch_id === Number(stockForm.data.branch_id));
    }, [locations, stockForm.data.branch_id]);

    // Available items in stockForm (the full catalogue, not just the paginated page)
    const formItemOptions: Named[] = useMemo(() => {
        return stockForm.data.item_type === 'product' ? products : ingredientOptions;
    }, [stockForm.data.item_type, products, ingredientOptions]);

    // Live system stock for the selected item & location in stockForm.
    useEffect(() => {
        if (!stockModalOpen || stockModalMode !== 'adjust') return;

        if (!stockForm.data.branch_id || !stockForm.data.stock_location_id || !stockForm.data.item_id) {
            setStockCurrentQty(null);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            fetch(
                route('inventory.balance', {
                    branch_id: stockForm.data.branch_id,
                    stock_location_id: stockForm.data.stock_location_id,
                    item_type: stockForm.data.item_type,
                    item_id: stockForm.data.item_id,
                }),
                {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    signal: controller.signal,
                }
            )
                .then((response) => (response.ok ? response.json() : Promise.reject(response)))
                .then((data) => setStockCurrentQty(Number(data.quantity)))
                .catch(() => {
                    if (!controller.signal.aborted) setStockCurrentQty(null);
                });
        }, 150);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [
        stockModalOpen,
        stockModalMode,
        stockForm.data.branch_id,
        stockForm.data.stock_location_id,
        stockForm.data.item_type,
        stockForm.data.item_id,
    ]);

    // Calculated variance delta
    const adjustmentDelta = useMemo(() => {
        if (stockModalMode !== 'adjust' || stockCurrentQty === null) return null;
        return Number((Number(stockForm.data.quantity) - stockCurrentQty).toFixed(3));
    }, [stockModalMode, stockCurrentQty, stockForm.data.quantity]);

    // Server-side filters for every inventory tab; any change resets pagination to page 1.
    // The active tab is part of the URL so pagination links keep each tab independent.
    const filterParams = (
        overrides: Partial<InventoryFilters> = {},
        active: InventoryTab = activeTab
    ): Record<string, string | number> => {
        const next: InventoryFilters = { ...inventoryFilters, ...overrides };
        const params: Record<string, string | number> = { tab: active };

        if (next.search.trim() !== '') params.search = next.search.trim();
        if (next.branch_id) params.branch_id = next.branch_id;
        if (next.location_id) params.location_id = next.location_id;
        if (next.depleted) params.depleted = 1;
        if (next.movement_search.trim() !== '') params.movement_search = next.movement_search.trim();
        if (next.movement_reason) params.movement_reason = next.movement_reason;
        if (next.ingredient_search.trim() !== '') params.ingredient_search = next.ingredient_search.trim();
        if (next.per_page) params.per_page = next.per_page;

        return params;
    };

    const applyInventoryFilters = (overrides: Partial<InventoryFilters> = {}) => {
        router.get(route('inventory.index'), filterParams(overrides), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (nextTab: InventoryTab) => {
        if (nextTab === activeTab) return;

        setActiveTab(nextTab);
        router.get(route('inventory.index'), filterParams({}, nextTab), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        const search = balanceSearch.trim();
        if (search === (inventoryFilters.search ?? '')) return;

        const timer = window.setTimeout(() => applyInventoryFilters({ search }), 350);

        return () => window.clearTimeout(timer);
    }, [balanceSearch, inventoryFilters, activeTab]);

    useEffect(() => {
        const search = movementSearch.trim();
        if (search === (inventoryFilters.movement_search ?? '')) return;

        const timer = window.setTimeout(() => applyInventoryFilters({ movement_search: search }), 350);

        return () => window.clearTimeout(timer);
    }, [movementSearch, inventoryFilters, activeTab]);

    useEffect(() => {
        const search = ingredientSearch.trim();
        if (search === (inventoryFilters.ingredient_search ?? '')) return;

        const timer = window.setTimeout(() => applyInventoryFilters({ ingredient_search: search }), 350);

        return () => window.clearTimeout(timer);
    }, [ingredientSearch, inventoryFilters, activeTab]);

    const paginationFooter = (paginator: Paginator<unknown>) =>
        paginator.data.length > 0 ? (
            <div className="border-t border-border/60 px-5 py-3 print:hidden">
                <Pagination
                    links={paginator.links}
                    from={paginator.from}
                    to={paginator.to}
                    total={paginator.total}
                    perPage={inventoryFilters.per_page}
                    perPageOptions={[10, 20, 50, 100]}
                    onPerPageChange={(value) => applyInventoryFilters({ per_page: Number(value) })}
                    className="pt-0"
                />
            </div>
        ) : null;

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
        setStockCurrentQty(prefill?.current_qty ?? null);
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
            badge: balances.total,
        },
        {
            key: 'movements',
            label: 'Stock Ledger (Audit Trail)',
            badge: movements.total,
        },
        {
            key: 'ingredients',
            label: 'Ingredients Catalog',
            badge: ingredients.total,
        },
        {
            key: 'units',
            label: 'Units of Measure',
            badge: units.total,
        },
    ];

    // Tab + filters forwarded to the full print document.
    const printParams = useMemo(() => {
        const params: Record<string, string | number> = { tab: activeTab };

        if (activeTab === 'balances') {
            if (inventoryFilters.search) params.search = inventoryFilters.search;
            if (inventoryFilters.branch_id) params.branch_id = inventoryFilters.branch_id;
            if (inventoryFilters.location_id) params.location_id = inventoryFilters.location_id;
            if (inventoryFilters.depleted) params.depleted = 1;
        }

        if (activeTab === 'movements') {
            if (inventoryFilters.movement_search) params.movement_search = inventoryFilters.movement_search;
            if (inventoryFilters.movement_reason) params.movement_reason = inventoryFilters.movement_reason;
        }

        if (activeTab === 'ingredients' && inventoryFilters.ingredient_search) {
            params.ingredient_search = inventoryFilters.ingredient_search;
        }

        return params;
    }, [activeTab, inventoryFilters]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Inventory & Stock Control"
                    description="Live branch balances, automated variance counts, ingredients catalog, and immutable movement ledger."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button
                                variant="secondary"
                                size="sm"
                                href={route('inventory.print', printParams)}
                                external
                                icon={<Printer className="h-3.5 w-3.5" />}
                                className="print:hidden"
                            >
                                Print
                            </Button>
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

            <div className="py-6 print:py-0">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
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

                    <PrintDocument title="Inventory & Stock Control" className="space-y-6">
                    {/* KPI Metrics */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Tracked Balances"
                            value={balances.total}
                            hint={`${ingredientOptions.length} ingredients · ${products.length} products`}
                        />
                        <KpiCard
                            label="Depleted / Out of Stock"
                            value={balanceStats.depleted}
                            tone={balanceStats.depleted > 0 ? 'danger' : 'success'}
                            hint={balanceStats.depleted > 0 ? 'Requires immediate restock' : 'All tracked stock positive'}
                        />
                        <KpiCard
                            label="Est. Stock Valuation"
                            value={formatMoney(balanceStats.valuation, currency)}
                            tone="neutral"
                            hint="Calculated from active ingredient unit costs"
                        />
                        <KpiCard
                            label="Ledger Movements"
                            value={movements.total}
                            hint="Across all recorded audit movements"
                        />
                    </div>

                    {/* Navigation Tabs */}
                    <div className="print:hidden">
                    <Tabs
                        tabs={tabs}
                        value={activeTab}
                        onChange={(tabKey) => changeTab(tabKey as InventoryTab)}
                    />
                    </div>

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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    applyInventoryFilters({ search: balanceSearch });
                                                }
                                            }}
                                            className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-64"
                                        />
                                        <select
                                            value={selectedBranchFilter}
                                            onChange={(e) => {
                                                setSelectedBranchFilter(e.target.value);
                                                applyInventoryFilters({
                                                    branch_id: e.target.value === 'all' ? null : Number(e.target.value),
                                                });
                                            }}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Branches</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedLocationFilter}
                                            onChange={(e) => {
                                                setSelectedLocationFilter(e.target.value);
                                                applyInventoryFilters({
                                                    location_id: e.target.value === 'all' ? null : Number(e.target.value),
                                                });
                                            }}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Locations</option>
                                            {locations.map((location) => (
                                                <option key={location.id} value={location.id}>
                                                    {location.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !lowStockOnly;
                                                setLowStockOnly(next);
                                                applyInventoryFilters({ depleted: next });
                                            }}
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
                                {balances.data.length === 0 ? (
                                    <EmptyState
                                        title="No Stock Balances Found"
                                        description={
                                            inventoryFilters.search ||
                                            inventoryFilters.depleted ||
                                            inventoryFilters.branch_id ||
                                            inventoryFilters.location_id
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
                                    <StockBalancesTable
                                        rows={balances.data}
                                        canAdjust={canAdjust}
                                        onAdjust={(row) =>
                                            handleOpenStockModal('adjust', {
                                                branch_id: row.branch_id,
                                                stock_location_id: row.stock_location_id,
                                                item_type: row.item_type as 'ingredient' | 'product',
                                                item_id: row.item_id,
                                                current_qty: row.quantity,
                                            })
                                        }
                                    />
                                )}
                                {paginationFooter(balances)}
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    applyInventoryFilters({ movement_search: movementSearch });
                                                }
                                            }}
                                            className="h-9 w-60 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                        <select
                                            value={movementReasonFilter}
                                            onChange={(e) => {
                                                setMovementReasonFilter(e.target.value);
                                                applyInventoryFilters({
                                                    movement_reason: e.target.value === 'all' ? '' : e.target.value,
                                                });
                                            }}
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
                                {movements.data.length === 0 ? (
                                    <EmptyState
                                        title="No Stock Movements Recorded"
                                        description="Transactions will appear here as stock is received, adjusted, or sold."
                                    />
                                ) : (
                                    <StockMovementsTable rows={movements.data} />
                                )}
                                {paginationFooter(movements)}
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    applyInventoryFilters({ ingredient_search: ingredientSearch });
                                                }
                                            }}
                                            className="h-9 w-52 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-64"
                                        />
                                        {canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setEditingIngredient(null);
                                                    ingredientForm.setData({
                                                        name: '',
                                                        unit_id: unitOptions[0]?.id ?? '',
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
                                {ingredients.data.length === 0 ? (
                                    <EmptyState
                                        title="No Ingredients Found"
                                        description="Add raw ingredients (flour, beef, milk…), then build each dish's recipe in Menu → edit product → Stock tracking mode: Use ingredients."
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
                                    <IngredientsTable
                                        rows={ingredients.data}
                                        currency={currency}
                                        canManage={canManage}
                                        onEdit={(row) => {
                                            setEditingIngredient(row);
                                            ingredientForm.setData({
                                                name: row.name,
                                                unit_id: row.unit_id ?? '',
                                                cost_per_unit: row.cost_per_unit,
                                                track_inventory: row.track_inventory,
                                                is_active: row.is_active,
                                            });
                                            setIngredientModalOpen(true);
                                        }}
                                        onDelete={handleDeleteIngredient}
                                    />
                                )}
                                {paginationFooter(ingredients)}
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
                                {units.data.length === 0 ? (
                                    <EmptyState
                                        title="No Units Found"
                                        description="Add standard units like kg, grams, liters, or pieces."
                                    />
                                ) : (
                                    <UnitsTable
                                        rows={units.data}
                                        canManage={canManage}
                                        onEdit={(row) => {
                                            setEditingUnit(row);
                                            unitForm.setData({
                                                name: row.name,
                                                code: row.code,
                                            });
                                            setUnitModalOpen(true);
                                        }}
                                        onDelete={handleDeleteUnit}
                                    />
                                )}
                                {paginationFooter(units)}
                            </CardBody>
                        </Card>
                    )}
                    </PrintDocument>
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
                        {stockModalMode === 'adjust' && stockCurrentQty !== null && (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 text-xs text-primary">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-primary">
                                        Current System Stock:
                                    </span>
                                    <span className="font-mono font-bold text-sm text-primary">
                                        {stockCurrentQty.toFixed(3)}
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
                                        Unit Cost ({currency})
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
                                    {unitOptions.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Cost Per Unit ({currency})
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
