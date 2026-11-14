<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Freezes the tax and service-charge decisions on the order so recalculating
 * after additional items are added never reinterprets a later tenant setting
 * change against earlier rounds.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('tax_inclusive')->default(false)->after('tax_total');
            $table->boolean('service_charge_applied')->default(false)->after('service_charge');
            $table->decimal('service_charge_rate', 8, 3)->default(0)->after('service_charge_applied');
        });

        // Best-effort backfill for orders that are still open.
        DB::table('tenants')->select('id', 'settings')->orderBy('id')->chunk(200, function ($tenants): void {
            foreach ($tenants as $tenant) {
                $settings = json_decode($tenant->settings ?? '{}', true) ?: [];
                $inclusive = (bool) data_get($settings, 'tax.inclusive', false);
                $serviceChargeRate = (float) data_get($settings, 'service_charge.rate', 0);

                DB::table('orders')
                    ->where('tenant_id', $tenant->id)
                    ->where('service_charge', '>', 0)
                    ->update(['service_charge_rate' => $serviceChargeRate]);

                DB::table('orders')
                    ->where('tenant_id', $tenant->id)
                    ->update(['tax_inclusive' => $inclusive]);
            }
        });

        DB::table('orders')->where('service_charge', '>', 0)->update(['service_charge_applied' => true]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tax_inclusive', 'service_charge_applied', 'service_charge_rate']);
        });
    }
};
