<?php

namespace App\Console\Commands;

use App\Domain\Notifications\NotificationService;
use App\Domain\PaymentGateways\GatewayProviderRegistry;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use Illuminate\Console\Command;

/**
 * Manual renewal for gateways without native recurring billing (bKash,
 * SSLCOMMERZ). Issues a renewal invoice when a period is about to end and
 * reminds the tenant to pay it with a fresh checkout. Paddle subscriptions are
 * renewed by provider webhooks and are skipped here.
 */
class RenewSubscriptions extends Command
{
    protected $signature = 'billing:renew-subscriptions';

    protected $description = 'Issue renewal invoices and reminders for manual-renewal subscriptions';

    public function handle(
        SubscriptionService $subscriptions,
        NotificationService $notifications,
        GatewayProviderRegistry $registry,
    ): int {
        $issued = 0;
        $reminded = 0;

        Subscription::withoutGlobalScopes()
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::Trialing->value, SubscriptionStatus::PastDue->value])
            ->where('cancel_at_period_end', false)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', now()->addDays(3))
            ->with('plan')
            ->each(function (Subscription $subscription) use ($subscriptions, $notifications, $registry, &$issued, &$reminded) {
                // Native recurring billing (Paddle) is driven by provider webhooks.
                if ($subscription->provider !== null && $registry->supportsRecurring($subscription->provider)) {
                    return;
                }

                $invoice = $subscriptions->issueRenewalInvoice($subscription);

                if ($invoice) {
                    $issued++;
                    $reminded += $notifications->renewalReminder($subscription);
                }
            });

        $this->info("Renewal invoices issued: {$issued}; reminders sent: {$reminded}.");

        return self::SUCCESS;
    }
}
