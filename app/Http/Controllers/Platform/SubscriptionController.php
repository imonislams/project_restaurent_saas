<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubscriptionController extends Controller
{
    public function __construct(protected SubscriptionService $subscriptions) {}

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

    public function renew(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->subscriptions->renew($subscription, $request->user());

        return back()->with('success', 'Subscription renewed and invoice issued.');
    }

    public function payInvoice(Request $request, SubscriptionInvoice $invoice): RedirectResponse
    {
        $this->subscriptions->payInvoice($invoice, $request->user());

        return back()->with('success', 'Invoice marked paid.');
    }
}
