<?php

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Every plan now includes every feature; plans differ only by limits and price.
 * Updates existing plans (and their captured subscription snapshots) in place.
 */
return new class extends Migration
{
    public function up(): void
    {
        $features = json_encode(Plan::ALL_FEATURES);

        DB::table('plans')->update(['features' => $features]);

        DB::table('subscriptions')->whereNotNull('plan_snapshot')->orderBy('id')->each(function ($row) use ($features) {
            $snapshot = json_decode($row->plan_snapshot, true) ?: [];
            $snapshot['features'] = json_decode($features, true);
            DB::table('subscriptions')->where('id', $row->id)->update(['plan_snapshot' => json_encode($snapshot)]);
        });

        DB::table('subscriptions')->pluck('tenant_id')->each(fn ($id) => Cache::forget("tenant:{$id}:plan"));
    }

    public function down(): void
    {
        // Previous per-plan feature sets are not recoverable; re-run PlanSeeder to customise.
    }
};
