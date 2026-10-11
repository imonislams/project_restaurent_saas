<?php

namespace App\Console\Commands;

use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use Illuminate\Console\Command;

class ProcessSubscriptions extends Command
{
    protected $signature = 'subscriptions:process';

    protected $description = 'Expire trials and suspend subscriptions past their grace period';

    public function handle(SubscriptionService $subscriptions): int
    {
        $trialsExpired = 0;
        Subscription::withoutGlobalScopes()
            ->where('status', SubscriptionStatus::Trialing->value)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->each(function (Subscription $subscription) use ($subscriptions, &$trialsExpired) {
                $subscriptions->markPastDue($subscription);
                $trialsExpired++;
            });

        $suspended = 0;
        Subscription::withoutGlobalScopes()
            ->where('status', SubscriptionStatus::PastDue->value)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', now()->subDays(7))
            ->each(function (Subscription $subscription) use ($subscriptions, &$suspended) {
                $subscriptions->suspend($subscription);
                $suspended++;
            });

        $this->info("Trials moved to past due: {$trialsExpired}; suspended after grace: {$suspended}");

        return self::SUCCESS;
    }
}
