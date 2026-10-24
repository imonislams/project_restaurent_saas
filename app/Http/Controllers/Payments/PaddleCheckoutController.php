<?php

namespace App\Http\Controllers\Payments;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\PlatformPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Paddle Billing has no hosted checkout page: `checkout.url` is the account's
 * default payment link with `?_ptxn=<transaction>` appended. This page loads
 * Paddle.js and opens the checkout for that transaction, then returns to a
 * verification endpoint so payment is confirmed server-side (never from the
 * browser alone).
 */
class PaddleCheckoutController extends Controller
{
    public function __invoke(Request $request): View
    {
        $transactionId = (string) $request->query('_ptxn', '');
        abort_if($transactionId === '', 404);

        $config = $this->configFor($transactionId);
        abort_if($config === null, 404, 'Paddle checkout is not configured.');

        $clientToken = (string) ($config->credentials['client_side_token'] ?? '');
        abort_if($clientToken === '', 404, 'Paddle checkout is not configured.');

        return view('payments.paddle-checkout', [
            'transactionId' => $transactionId,
            'clientToken' => $clientToken,
            'environment' => $config->environment->value,
            'returnUrl' => route('payments.paddle.return'),
        ]);
    }

    public function return(Request $request, PlatformPaymentService $payments): RedirectResponse
    {
        $transactionId = (string) $request->query('_ptxn', '');
        $verified = $transactionId !== '' && $payments->verifyPending('paddle', $transactionId);

        return redirect()->route('payments.result', ['status' => $verified ? 'success' : 'failed']);
    }

    protected function configFor(string $transactionId): ?PaymentGateway
    {
        $payment = PlatformPayment::query()->where('provider_ref', $transactionId)->first();
        $configId = $payment?->meta['gateway_config_id'] ?? null;

        return ($configId ? PaymentGateway::query()->find($configId) : null)
            ?? PaymentGateway::query()
                ->where('provider', 'paddle')
                ->where('is_enabled', true)
                ->orderByDesc('is_default')
                ->first();
    }
}
