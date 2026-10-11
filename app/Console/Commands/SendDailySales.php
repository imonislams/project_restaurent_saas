<?php

namespace App\Console\Commands;

use App\Domain\Notifications\NotificationService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Console\Command;

class SendDailySales extends Command
{
    protected $signature = 'notifications:daily-sales';

    protected $description = 'Send a daily sales summary to each tenant owner';

    public function handle(NotificationService $notifications): int
    {
        $sent = 0;

        Tenant::query()->each(function (Tenant $tenant) use ($notifications, &$sent) {
            $sent += $notifications->dailySales($tenant, now());
        });

        $this->info("Daily sales summaries sent to {$sent} recipient(s).");

        return self::SUCCESS;
    }
}
