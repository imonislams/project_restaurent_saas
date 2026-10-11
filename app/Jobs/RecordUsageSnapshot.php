<?php

namespace App\Jobs;

use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Stores a periodic usage snapshot for every tenant (billing/metering).
 */
class RecordUsageSnapshot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function handle(UsageService $usage): void
    {
        Tenant::query()->each(fn (Tenant $tenant) => $usage->record($tenant));
    }
}
