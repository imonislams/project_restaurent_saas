<?php

namespace App\Domain\Inventory\Actions;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\UnitConversion;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Seeds sensible inventory defaults when a tenant or branch is created so the
 * inventory module is usable without upfront configuration.
 */
class ProvisionInventoryDefaults
{
    /** @var list<array{name: string, code: string}> */
    protected const UNITS = [
        ['name' => 'Piece', 'code' => 'pc'],
        ['name' => 'Kilogram', 'code' => 'kg'],
        ['name' => 'Gram', 'code' => 'g'],
        ['name' => 'Litre', 'code' => 'L'],
        ['name' => 'Millilitre', 'code' => 'mL'],
    ];

    /** @var list<array{from: string, to: string, factor: float}> */
    protected const CONVERSIONS = [
        ['from' => 'kg', 'to' => 'g', 'factor' => 1000],
        ['from' => 'L', 'to' => 'mL', 'factor' => 1000],
    ];

    public function forTenant(Tenant $tenant): void
    {
        if ($tenant->units()->exists()) {
            return;
        }

        $units = [];

        foreach (self::UNITS as $unit) {
            $units[$unit['code']] = $tenant->units()->create($unit);
        }

        foreach (self::CONVERSIONS as $conversion) {
            if (! isset($units[$conversion['from']], $units[$conversion['to']])) {
                continue;
            }

            UnitConversion::create([
                'tenant_id' => $tenant->getKey(),
                'from_unit_id' => $units[$conversion['from']]->getKey(),
                'to_unit_id' => $units[$conversion['to']]->getKey(),
                'factor' => $conversion['factor'],
            ]);
        }
    }

    public function defaultLocationFor(Branch $branch): StockLocation
    {
        $existing = $branch->stockLocations()->where('is_default', true)->first();

        if ($existing) {
            return $existing;
        }

        return $branch->stockLocations()->create([
            'tenant_id' => $branch->tenant_id,
            'name' => 'Main Store',
            'is_default' => true,
        ]);
    }
}
