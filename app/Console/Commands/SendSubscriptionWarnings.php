<?php

namespace App\Console\Commands;

use App\Domain\Notifications\NotificationService;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use Illuminate\Console\Command;

class SendSubscriptionWarnings extends Command
{
    protected $signature = 'billing:warn-expiring';

    protected $description = 'Warn tenants whose trial or period ends within 10 days';

    public function handle(NotificationService $notifications): int
    {
        $sent = 0;

        Subscription::withoutGlobalScopes()
            ->whereIn('status', [SubscriptionStatus::Trialing->value, SubscriptionStatus::Active->value])
            ->whereNotNull('current_period_end')
            ->whereBetween('current_period_end', [now(), now()->addDays(10)])
            ->each(function (Subscription $subscription) use ($notifications, &$sent) {
                $sent += $notifications->subscriptionExpiring($subscription);
            });

        $this->info("Subscription warnings sent to {$sent} recipient(s).");

        return self::SUCCESS;
    }
}
