import PrintButton from '@/Components/print/PrintButton';
import PrintDocument from '@/Components/print/PrintDocument';
import { Button, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import StockBalancesTable from './Partials/StockBalancesTable';
import type { StockBalanceRow } from './Partials/StockBalancesTable';
import StockMovementsTable from './Partials/StockMovementsTable';
import type { StockMovementRow } from './Partials/StockMovementsTable';
import IngredientsTable from './Partials/IngredientsTable';
import type { IngredientRow } from './Partials/IngredientsTable';
import UnitsTable from './Partials/UnitsTable';
import type { UnitRow } from './Partials/UnitsTable';

type InventoryPrintTab = 'balances' | 'movements' | 'ingredients' | 'units';

const TITLES: Record<InventoryPrintTab, string> = {
    balances: 'Stock on Hand',
    movements: 'Stock Movement Ledger',
    ingredients: 'Ingredients Catalog',
    units: 'Units of Measurement',
};

export default function InventoryPrint({
    tab,
    rows,
    total,
    filterSummary,
}: {
    tab: InventoryPrintTab;
    rows: Array<StockBalanceRow | StockMovementRow | IngredientRow | UnitRow>;
    total: number;
    filterSummary: string;
}) {
    const { currency } = usePage().props as Record<string, any>;
    const title = TITLES[tab] ?? TITLES.balances;

    useEffect(() => {
        const timer = window.setTimeout(() => window.print(), 250);

        return () => window.clearTimeout(timer);
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={title}
                    description="Complete printable inventory list for the applied filters."
                    actions={
                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="secondary" size="sm" href={route('inventory.index', { tab })}>
                                Back to Inventory
                            </Button>
                            <PrintButton title={title} />
                        </div>
                    }
                />
            }
        >
            <Head title={title} />

            <div className="py-6 print:py-0">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
                    <PrintDocument
                        title={title}
                        meta={[
                            { label: 'Records', value: total },
                            { label: 'Filters', value: filterSummary },
                        ]}
                        className="space-y-4"
                    >
                        {rows.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-500">
                                No records match the selected filters.
                            </p>
                        ) : (
                            <>
                                {tab === 'balances' && (
                                    <StockBalancesTable rows={rows as StockBalanceRow[]} />
                                )}
                                {tab === 'movements' && (
                                    <StockMovementsTable rows={rows as StockMovementRow[]} />
                                )}
                                {tab === 'ingredients' && (
                                    <IngredientsTable rows={rows as IngredientRow[]} currency={currency} />
                                )}
                                {tab === 'units' && <UnitsTable rows={rows as UnitRow[]} />}
                            </>
                        )}
                    </PrintDocument>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
