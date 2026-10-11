<?php

namespace App\Console\Commands;

use App\Domain\Notifications\NotificationService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Console\Command;

class SendLowStockAlerts extends Command
{
    protected $signature = 'alerts:low-stock';

    protected $description = 'Notify owners about items at or below the reorder threshold';

    public function handle(NotificationService $notifications): int
    {
        $sent = 0;

        Tenant::query()->each(function (Tenant $tenant) use ($notifications, &$sent) {
            $sent += $notifications->lowStock($tenant);
        });

        $this->info("Low-stock notifications sent to {$sent} recipient(s).");

        return self::SUCCESS;
    }
}
