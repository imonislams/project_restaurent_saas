<?php

namespace App\Console\Commands;

use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use Illuminate\Console\Command;

class ProcessSubscriptions extends Command
{
    protected $signature = 'subscriptions:process';

    protected $description = 'Advance subscriptions through the trial → past due → grace → suspended / expired pipeline';

    public function handle(SubscriptionService $subscriptions): int
    {
        $dunningDays = (int) (app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('billing.dunning_days') ?? config('platform.billing.dunning_days', 7));

        $pastDue = 0;
        Subscription::withoutGlobalScopes()
            ->where('status', SubscriptionStatus::Trialing->value)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->each(function (Subscription $subscription) use ($subscriptions, &$pastDue) {
                $subscriptions->markPastDue($subscription);
                $pastDue++;
            });

        $grace = 0;
        Subscription::withoutGlobalScopes()
            ->where('status', SubscriptionStatus::PastDue->value)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', now()->subDays($dunningDays))
            ->each(function (Subscription $subscription) use ($subscriptions, &$grace) {
                $subscriptions->enterGrace($subscription);
                $grace++;
            });

        $suspended = 0;
        Subscription::withoutGlobalScopes()
            ->where('status', SubscriptionStatus::GracePeriod->value)
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<', now())
            ->each(function (Subscription $subscription) use ($subscriptions, &$suspended) {
                $subscriptions->suspend($subscription);
                $suspended++;
            });

        $expired = 0;
        Subscription::withoutGlobalScopes()
            ->where('cancel_at_period_end', true)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', now())
            ->each(function (Subscription $subscription) use ($subscriptions, &$expired) {
                $subscriptions->expire($subscription);
                $expired++;
            });

        $this->info("Past due: {$pastDue}; entered grace: {$grace}; suspended: {$suspended}; expired: {$expired}");

        return self::SUCCESS;
    }
}
