<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function __construct(protected SubscriptionService $subscriptions) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'plan' => $request->string('plan')->toString(),
        ];

        $statuses = array_filter(explode(',', $filters['status']));

        return Inertia::render('Platform/Subscriptions/Index', [
            'subscriptions' => Subscription::withoutGlobalScopes()
                ->with(['tenant:id,name', 'plan:id,name,currency,price_monthly,price_yearly', 'coupon:id,code'])
                ->when($filters['search'] !== '', fn ($q) => $q->whereHas('tenant', fn ($t) => $t->where('name', 'like', '%'.$filters['search'].'%')))
                ->when($statuses !== [], fn ($q) => $q->whereIn('status', $statuses))
                ->when($filters['plan'] !== '', fn ($q) => $q->whereHas('plan', fn ($p) => $p->where('slug', $filters['plan'])))
                ->orderByDesc('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (Subscription $subscription) => $this->row($subscription)),
            'filters' => $filters,
            'options' => [
                'statuses' => collect(SubscriptionStatus::cases())->map(fn (SubscriptionStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
                'plans' => Plan::query()->orderBy('sort_order')->get()->map(fn (Plan $p) => ['value' => $p->slug, 'label' => $p->name])->all(),
            ],
        ]);
    }

    public function trials(Request $request): Response
    {
        if (! $request->has('status')) {
            $request->merge(['status' => SubscriptionStatus::Trialing->value]);
        }

        return $this->index($request);
    }

    public function pastDue(Request $request): Response
    {
        if (! $request->has('status')) {
            $request->merge(['status' => SubscriptionStatus::PastDue->value.','.SubscriptionStatus::GracePeriod->value]);
        }

        return $this->index($request);
    }

    public function cancellations(Request $request): Response
    {
        if (! $request->has('status')) {
            $request->merge(['status' => SubscriptionStatus::Cancelled->value.','.SubscriptionStatus::Expired->value]);
        }

        return $this->index($request);
    }

    public function changePlan(Request $request, Subscription $subscription): RedirectResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', Rule::exists('plans', 'id')],
            'billing_cycle' => ['required', Rule::in(BillingCycle::values())],
        ]);

        $this->subscriptions->changePlan(
            $subscription,
            Plan::query()->findOrFail($data['plan_id']),
            BillingCycle::from($data['billing_cycle']),
            $request->user(),
        );

        return back()->with('success', 'Subscription plan updated.');
    }

    public function suspend(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->suspend($subscription, $request->user());

        return back()->with('success', 'Subscription suspended.');
    }

    public function reactivate(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->activate($subscription, $request->user());

        return back()->with('success', 'Subscription reactivated.');
    }

    public function cancel(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->cancel($subscription, $request->user());

        return back()->with('success', 'Subscription cancelled.');
    }

    public function scheduleCancel(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->scheduleCancelAtPeriodEnd($subscription, $request->user());

        return back()->with('success', 'Subscription will cancel at the end of the current period.');
    }

    public function renew(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->renew($subscription, $request->user());

        return back()->with('success', 'Subscription renewed and invoice issued.');
    }

    public function retryRenewal(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->retryRenewal($subscription, $request->user());

        return back()->with('success', 'Renewal retried and invoice paid.');
    }

    public function applyCoupon(Request $request, Subscription $subscription): RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:60']]);

        $coupon = $this->subscriptions->applyCoupon($subscription, $data['code'], $request->user());

        return back()->with('success', "Coupon {$coupon->code} applied.");
    }

    public function removeCoupon(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->removeCoupon($subscription, $request->user());

        return back()->with('success', 'Coupon removed.');
    }

    public function payInvoice(Request $request, SubscriptionInvoice $invoice): RedirectResponse
    {
        $this->subscriptions->payInvoice($invoice, $request->user());

        return back()->with('success', 'Invoice marked paid.');
    }

    /** @return array<string, mixed> */
    protected function row(Subscription $subscription): array
    {
        $plan = $subscription->plan;
        $mrr = 0.0;

        if ($plan) {
            $mrr = $subscription->billing_cycle->value === 'yearly'
                ? round((float) $plan->price_yearly / 12, 2)
                : (float) $plan->price_monthly;
        }

        return [
            'id' => $subscription->getKey(),
            'tenant' => $subscription->tenant?->name,
            'tenant_id' => $subscription->tenant_id,
            'plan' => $plan?->name,
            'plan_id' => $subscription->plan_id,
            'billing_cycle' => $subscription->billing_cycle->value,
            'status' => $subscription->status->value,
            'status_label' => $subscription->status->label(),
            'currency' => $plan?->currency ?? config('platform.reporting_currency', 'USD'),
            'mrr' => $mrr,
            'coupon_code' => $subscription->coupon?->code,
            'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
            'current_period_end' => $subscription->current_period_end?->toIso8601String(),
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            'cancel_at_period_end' => $subscription->cancel_at_period_end,
            'days_remaining' => $subscription->daysRemaining(),
        ];
    }
}
