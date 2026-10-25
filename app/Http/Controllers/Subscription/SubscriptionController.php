<?php

namespace App\Http\Controllers\Subscription;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\GatewayEligibilityService;
use App\Domain\Billing\InvoiceService;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\PlatformPaymentService;
use App\Domain\Billing\PricingRegionContext;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\PlanRegion;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\PricingService;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Tenant self-service subscription: view the current plan and entitlements,
 * upgrade/downgrade, pay invoices online with an eligible gateway, cancel or
 * resume renewal, and download invoices. No proration — the new period is
 * billed, and a requested change is only activated once its invoice is paid
 * (the tenant keeps the current plan until then).
 *
 * Eligible gateways are always resolved for the currency an invoice is actually
 * billed in (the same currency PricingService uses to issue invoices), so the
 * checkout offered to the tenant is never rejected for a currency mismatch.
 */
class SubscriptionController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptions,
        protected UsageService $usage,
        protected PlatformPaymentService $payments,
        protected GatewayEligibilityService $eligibility,
        protected InvoiceService $invoices,
        protected PricingService $pricing,
        protected PricingRegionContext $pricingRegion,
    ) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $subscription = $tenant?->subscription?->load('plan', 'pendingPlan', 'pendingInvoice');

        // Offer only the tenant's regional ladder (Bangladesh or International),
        // exactly like the public pricing page.
        $planRegion = $tenant
            ? $this->pricingRegion->regionForTenant($tenant)
            : $this->pricingRegion->region();

        $plans = Plan::query()
            ->where('is_active', true)
            ->whereNull('archived_at')
            ->where('visibility', 'public')
            ->whereIn('region', PlanRegion::visibleTo($planRegion))
            ->with('prices')
            ->orderBy('sort_order')
            ->get();

        $plan = $subscription?->plan;

        // The tenant's billing currency — not the current plan's fallback — so
        // the whole page reflects what the tenant is billed in.
        $currency = $tenant
            ? strtoupper((string) (
                $tenant->getSetting('billing.currency')
                ?? $tenant->getSetting('region.currency')
                ?? $this->pricingRegion->currencyFor($planRegion)
            ))
            : $this->pricingRegion->currencyFor($planRegion);

        $invoiceRows = $subscription
            ? $subscription->invoices()->latest('id')->limit(24)->get()
            : collect();

        // Resolve eligible gateways once per distinct invoice currency (avoids N+1).
        $gatewaysByCurrency = $invoiceRows->pluck('currency')
            ->push($currency)
            ->filter()
            ->map(fn ($code) => strtoupper((string) $code))
            ->unique()
            ->mapWithKeys(fn (string $code) => [$code => $this->gatewayOptions($tenant, $plan, $code)]);

        return Inertia::render('Subscription/Index', [
            'subscription' => $subscription ? [
                'id' => $subscription->getKey(),
                'plan' => $plan?->name,
                'plan_id' => $subscription->plan_id,
                'status' => $subscription->status->value,
                'status_label' => $subscription->status->label(),
                'billing_cycle' => $subscription->billing_cycle->value,
                'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
                'days_remaining' => $subscription->daysRemaining(),
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
                'provider' => $subscription->provider,
            ] : null,
            'pending_plan' => $subscription?->hasPendingPlanChange() ? [
                'plan' => $subscription->pendingPlan?->name,
                'plan_id' => $subscription->pending_plan_id,
                'billing_cycle' => $subscription->pending_billing_cycle?->value,
                'invoice_id' => $subscription->pending_invoice_id,
                'invoice_number' => $subscription->pendingInvoice?->number,
                'since' => $subscription->pending_since?->toIso8601String(),
            ] : null,
            'usage' => $tenant ? $this->usage->metrics($tenant) : [],
            'limits' => [
                'branches' => $tenant?->planLimit('branches'),
                'users' => $tenant?->planLimit('users'),
                'orders_this_month' => $tenant?->planLimit('orders_this_month'),
            ],
            'plans' => $plans->map(function (Plan $plan) use ($currency) {
                // Show each plan priced in the tenant's billing currency when a
                // price exists for both intervals; otherwise fall back to the
                // plan's own currency (never mixing currencies in one card).
                $monthly = $this->pricing->priceFor($plan, $currency, BillingCycle::Monthly);
                $yearly = $this->pricing->priceFor($plan, $currency, BillingCycle::Yearly);
                $pricedInTenantCurrency = $monthly !== null && $yearly !== null;

                return [
                    'id' => $plan->getKey(),
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'currency' => $pricedInTenantCurrency ? $currency : strtoupper((string) $plan->currency),
                    'price_monthly' => (float) ($pricedInTenantCurrency ? $monthly : $plan->price_monthly),
                    'price_yearly' => (float) ($pricedInTenantCurrency ? $yearly : $plan->price_yearly),
                    'trial_days' => $plan->trial_days,
                    'features' => $plan->features ?? [],
                    'limits' => $plan->limits ?? [],
                ];
            })->values(),
            'invoices' => $invoiceRows->map(fn (SubscriptionInvoice $invoice) => [
                'id' => $invoice->getKey(),
                'number' => $invoice->number,
                'amount' => (float) $invoice->amount,
                'subtotal' => (float) $invoice->subtotal,
                'discount_amount' => (float) $invoice->discount_amount,
                'currency' => $invoice->currency,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at?->toIso8601String(),
                'due_date' => $invoice->due_date?->toIso8601String(),
                'paid_at' => $invoice->paid_at?->toIso8601String(),
                'outstanding' => $invoice->outstandingAmount(),
                'download_url' => route('subscription.invoices.document', $invoice),
                'gateways' => $gatewaysByCurrency[strtoupper((string) $invoice->currency)] ?? [],
            ])->all(),
            'payments' => $tenant
                ? PlatformPayment::query()
                    ->where('tenant_id', $tenant->getKey())
                    ->latest('id')
                    ->limit(15)
                    ->get()
                    ->map(fn (PlatformPayment $payment) => [
                        'id' => $payment->getKey(),
                        'gateway' => $payment->meta['gateway'] ?? ucfirst($payment->gateway),
                        'amount' => (float) $payment->amount,
                        'currency' => $payment->currency,
                        'status' => $payment->status->value,
                        'status_label' => $payment->status->label(),
                        'provider_ref' => $payment->provider_ref,
                        'paid_at' => $payment->paid_at?->toIso8601String(),
                        'failure_reason' => $payment->failure_reason,
                        'invoice_id' => $payment->subscription_invoice_id,
                    ])->all()
                : [],
            'gateways' => $gatewaysByCurrency[$currency] ?? [],
            'currency' => $currency,
            'billing' => [
                'country' => $tenant?->getSetting('billing.country', $tenant?->getSetting('region.country')),
                'configured' => (bool) $tenant?->getSetting('billing.country', $tenant?->getSetting('region.country')),
                'settings_url' => route('settings.show', ['group' => 'billing']),
            ],
        ]);
    }

    public function changePlan(Request $request): SymfonyResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', Rule::exists('plans', 'id')],
            'billing_cycle' => ['required', Rule::in(BillingCycle::values())],
        ]);

        $tenant = $request->user()->tenant;
        abort_if($tenant?->subscription === null, 422, 'There is no subscription on record.');

        $plan = Plan::query()->findOrFail($data['plan_id']);
        abort_if($plan->isArchived(), 422, 'That plan is not available.');

        // A tenant can only switch within their regional ladder (or to a global plan).
        $planRegion = $this->pricingRegion->regionForTenant($tenant);
        abort_unless(
            in_array($plan->region?->value, PlanRegion::visibleTo($planRegion), true),
            422,
            'That plan is not available for your region.',
        );

        $subscription = $tenant->subscription;

        // Hold the requested change as pending and bill the target plan (no
        // proration). The live plan is only activated once this invoice is paid.
        $invoice = $this->subscriptions->requestPlanChange(
            $subscription,
            $plan,
            BillingCycle::from($data['billing_cycle']),
            $request->user(),
        );

        // Nothing to pay (free plan / fully discounted) — activate immediately.
        if ((float) $invoice->amount <= 0) {
            $this->subscriptions->payInvoice($invoice, $request->user());

            return back()->with('success', "Your plan is now {$plan->name}.");
        }

        $gateways = $this->eligibility->eligibleFor($tenant, $plan, $invoice->currency);

        // No gateway can take the billed currency — say so precisely instead of
        // leaving the tenant with an unusable checkout button.
        if ($gateways->isEmpty()) {
            return back()->with('error', "Your change to {$plan->name} is pending, but no payment method supports {$invoice->currency}. "
                .'Ask your platform administrator to enable a gateway for this currency, or contact support.');
        }

        // Exactly one option — take the tenant straight to the hosted checkout.
        if ($gateways->count() === 1) {
            $result = $this->payments->initiate($invoice, $gateways->first(), $request->user());

            if ($result['redirect_url']) {
                return Inertia::location($result['redirect_url']);
            }

            if ($result['payment']->status === PlatformPaymentStatus::Failed) {
                $reason = $result['payment']->failure_reason;

                return back()->with('error', "Your change to {$plan->name} is pending. The checkout could not start"
                    .($reason ? ': '.$reason : '.')
                    ." Please retry invoice {$invoice->number} from the list below.");
            }

            return back()->with('success', "Your change to {$plan->name} is pending. Complete the payment for invoice {$invoice->number} to activate it.");
        }

        // Several options — the tenant chooses on the invoice row.
        return back()->with('success', "Your change to {$plan->name} is pending. Choose a payment method for invoice {$invoice->number} below to activate it.");
    }

    public function payInvoice(Request $request, SubscriptionInvoice $invoice): SymfonyResponse
    {
        abort_unless($invoice->tenant_id === $request->user()->tenant_id, 404);
        abort_unless(app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('features.gateway_checkout', true), 403, 'Online checkout is disabled.');

        $data = $request->validate(['gateway_id' => ['required', 'integer', 'exists:payment_gateways,id']]);

        $config = PaymentGateway::query()->findOrFail($data['gateway_id']);
        $tenant = $request->user()->tenant;

        // Re-validate eligibility on the server; the client selection is untrusted.
        abort_unless(
            $tenant && $this->eligibility->isEligible($tenant, $config, $invoice->subscription?->plan, $invoice->currency),
            403,
            'That payment method is not available for this invoice.',
        );

        $result = $this->payments->initiate($invoice, $config, $request->user());

        if ($result['redirect_url']) {
            return Inertia::location($result['redirect_url']);
        }

        if ($result['payment']->status === PlatformPaymentStatus::Failed) {
            $reason = $result['payment']->failure_reason;

            return back()->with('error', $reason
                ? "We could not start the checkout: {$reason}"
                : 'We could not start the checkout at the gateway. Please try again or contact support.');
        }

        return back()->with('success', 'Payment initiated. It will be confirmed once the payment is verified.');
    }

    public function cancel(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        abort_if($tenant?->subscription === null, 404, 'There is no subscription on record.');

        $this->subscriptions->scheduleCancelAtPeriodEnd($tenant->subscription, $request->user());

        return back()->with('success', 'Your subscription will not renew. Access continues until the end of the period.');
    }

    public function resume(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        abort_if($tenant?->subscription === null, 404, 'There is no subscription on record.');

        $this->subscriptions->resume($tenant->subscription, $request->user());

        return back()->with('success', 'Renewal has been resumed.');
    }

    public function downloadInvoice(Request $request, SubscriptionInvoice $invoice): SymfonyResponse
    {
        abort_unless($invoice->tenant_id === $request->user()->tenant_id, 404);

        return $this->invoices->pdf($invoice)->download('invoice-'.$invoice->number.'.pdf');
    }

    /**
     * Enabled gateways the tenant may use for a plan and currency.
     *
     * @return list<array{value: string, label: string, provider: string, is_default: bool}>
     */
    protected function gatewayOptions(?Tenant $tenant, ?Plan $plan, string $currency): array
    {
        if (! $tenant) {
            return [];
        }

        return $this->eligibility->eligibleFor($tenant, $plan, strtoupper($currency))
            ->map(fn (PaymentGateway $config) => [
                'value' => (string) $config->getKey(),
                'label' => $config->displayName(),
                'provider' => $config->provider,
                'is_default' => (bool) $config->is_default,
            ])
            ->values()
            ->all();
    }
}
