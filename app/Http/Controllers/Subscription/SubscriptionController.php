<?php

namespace App\Http\Controllers\Subscription;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\PlatformPaymentService;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Subscriptions\UsageService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Tenant self-service subscription: view the current plan and entitlements,
 * upgrade/downgrade, and pay invoices online. No proration — a change applies
 * immediately and the new period is billed.
 */
class SubscriptionController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptions,
        protected UsageService $usage,
        protected PlatformPaymentService $payments,
        protected PlatformGatewayManager $gateways,
    ) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $subscription = $tenant?->subscription?->load('plan');

        $plans = Plan::query()
            ->where('is_active', true)
            ->whereNull('archived_at')
            ->where('visibility', 'public')
            ->with('prices')
            ->orderBy('sort_order')
            ->get();

        $currency = $subscription?->plan?->currency ?? 'USD';

        return Inertia::render('Subscription/Index', [
            'subscription' => $subscription ? [
                'id' => $subscription->getKey(),
                'plan' => $subscription->plan?->name,
                'plan_id' => $subscription->plan_id,
                'status' => $subscription->status->value,
                'status_label' => $subscription->status->label(),
                'billing_cycle' => $subscription->billing_cycle->value,
                'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
                'days_remaining' => $subscription->daysRemaining(),
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
            ] : null,
            'usage' => $tenant ? $this->usage->metrics($tenant) : [],
            'limits' => [
                'branches' => $tenant?->planLimit('branches'),
                'users' => $tenant?->planLimit('users'),
                'orders_this_month' => $tenant?->planLimit('orders_this_month'),
            ],
            'plans' => $plans->map(fn (Plan $plan) => [
                'id' => $plan->getKey(),
                'name' => $plan->name,
                'description' => $plan->description,
                'currency' => $plan->currency,
                'price_monthly' => (float) $plan->price_monthly,
                'price_yearly' => (float) $plan->price_yearly,
                'trial_days' => $plan->trial_days,
                'features' => $plan->features ?? [],
                'limits' => $plan->limits ?? [],
            ])->values(),
            'invoices' => $subscription
                ? $subscription->invoices()->latest('id')->limit(12)->get()->map(fn (SubscriptionInvoice $invoice) => [
                    'id' => $invoice->getKey(),
                    'number' => $invoice->number,
                    'amount' => (float) $invoice->amount,
                    'currency' => $invoice->currency,
                    'status' => $invoice->status->value,
                    'status_label' => $invoice->status->label(),
                    'issued_at' => $invoice->issued_at?->toIso8601String(),
                    'paid_at' => $invoice->paid_at?->toIso8601String(),
                    'outstanding' => $invoice->outstandingAmount(),
                ])->all()
                : [],
            'gateways' => $this->gateways->forCurrency($currency)
                ->map(fn (PaymentGateway $config) => ['value' => (string) $config->getKey(), 'label' => $config->displayName()])
                ->values()
                ->all(),
        ]);
    }

    public function changePlan(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', Rule::exists('plans', 'id')],
            'billing_cycle' => ['required', Rule::in(BillingCycle::values())],
        ]);

        $tenant = $request->user()->tenant;
        abort_if($tenant?->subscription === null, 422, 'There is no subscription on record.');

        $plan = Plan::query()->findOrFail($data['plan_id']);
        abort_if($plan->isArchived(), 422, 'That plan is not available.');

        $subscription = $tenant->subscription;

        $this->subscriptions->changePlan($subscription, $plan, BillingCycle::from($data['billing_cycle']), $request->user());

        // Bill the new period at the new plan's price (no proration).
        $invoice = $this->subscriptions->issueInvoice($subscription->fresh());

        return back()->with('success', "Your plan is now {$plan->name}. Invoice {$invoice->number} is ready to pay.");
    }

    public function payInvoice(Request $request, SubscriptionInvoice $invoice): SymfonyResponse
    {
        $data = $request->validate(['gateway_id' => ['required', 'integer', 'exists:payment_gateways,id']]);

        abort_unless($invoice->tenant_id === $request->user()->tenant_id, 404);

        $config = PaymentGateway::query()->findOrFail($data['gateway_id']);

        $result = $this->payments->initiate($invoice, $config, $request->user());

        if ($result['redirect_url']) {
            return Inertia::location($result['redirect_url']);
        }

        return back()->with('success', 'Payment initiated.');
    }
}
