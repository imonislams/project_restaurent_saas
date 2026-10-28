<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Demo\DemoRun;
use App\Domain\Notifications\Notifications\OrderHandedOverNotification;
use App\Domain\Notifications\Notifications\OrderReadyNotification;
use App\Domain\Notifications\Notifications\OrderServedForBillingNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Closes the run: records the high-level facts shown on the dashboard banner and
 * the Demo data settings page (currency, coverage, when it was generated).
 */
class FinalizeStep implements DemoStep
{
    /**
     * Notifications that were merely informing staff about an order that has
     * long since been served. They stay in the history but never as an unread
     * badge — unlike the actionable ones (approval requests, bill requests,
     * stock alerts) which are what an owner should actually see waiting.
     *
     * @var list<class-string>
     */
    protected const SETTLED_NOTIFICATIONS = [
        OrderReadyNotification::class,
        OrderHandedOverNotification::class,
        OrderServedForBillingNotification::class,
    ];

    public function key(): string
    {
        return 'finalize';
    }

    public function label(): string
    {
        return 'Finishing touches';
    }

    public function run(DemoRun $run): array
    {
        $profile = $run->profile();
        $plan = (array) $run->ref('day_plan', []);
        $tenant = $run->tenant();
        $generatedAt = now()->toIso8601String();

        $run->batch->setCounts([
            'currency' => $profile->currency(),
            'profile' => $profile->locale(),
            'days' => count($plan),
            'first_day' => $plan[0] ?? null,
            'last_day' => $plan === [] ? null : end($plan),
            'generated_at' => $generatedAt,
        ]);

        $tenant->mergeSettings([
            'demo.generated_at' => $generatedAt,
            'demo.days' => count($plan),
        ]);

        $tenant->save();

        $this->settleOldNotifications($run);

        return [];
    }

    /**
     * Three weeks of history would otherwise leave thousands of notification
     * rows — and a bell reading "412". Rows older than a day are dropped, and
     * only the last ~20 minutes of activity stays unread, so the badge shows
     * what is genuinely live (today's approval queue and bill requests) rather
     * than the whole backlog.
     */
    protected function settleOldNotifications(DemoRun $run): void
    {
        $userIds = User::query()->where('tenant_id', $run->batch->tenant_id)->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        $notifications = DB::table('notifications')
            ->where('notifiable_type', (new User)->getMorphClass())
            ->whereIn('notifiable_id', $userIds);

        (clone $notifications)
            ->whereNull('read_at')
            ->where('created_at', '<', now()->subMinutes(20))
            ->update(['read_at' => now()]);

        (clone $notifications)
            ->whereNull('read_at')
            ->whereIn('type', self::SETTLED_NOTIFICATIONS)
            ->update(['read_at' => now()]);

        (clone $notifications)->where('created_at', '<', now()->subDay())->delete();
    }
}
