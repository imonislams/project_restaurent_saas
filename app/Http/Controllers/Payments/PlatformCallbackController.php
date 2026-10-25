<?php

namespace App\Http\Controllers\Payments;

use App\Domain\Billing\PlatformPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

/**
 * Public SSLCommerz return/IPN endpoints. These are unauthenticated; a payment
 * is only applied after server-side verification inside PlatformPaymentService.
 */
class PlatformCallbackController extends Controller
{
    public function __construct(protected PlatformPaymentService $payments) {}

    public function callback(Request $request, string $provider, string $result): RedirectResponse
    {
        if ($result === 'success') {
            $this->payments->handleNotification($provider, $request->all());

            // The provider also posts a server IPN for the same transaction, so
            // this return is often a duplicate. Report the payment's real state
            // rather than treating "already processed" as a failure.
            $settled = $this->payments->notificationSettled($provider, $request->all());

            return redirect()->route('payments.result', [
                'status' => $settled ? 'success' : 'failed',
            ]);
        }

        return redirect()->route('payments.result', ['status' => $result === 'cancel' ? 'cancelled' : 'failed']);
    }

    public function ipn(Request $request, string $provider): JsonResponse
    {
        $outcome = $this->payments->handleNotification($provider, $request->all());

        return response()->json($outcome);
    }

    public function result(Request $request): \Illuminate\View\View
    {
        $status = (string) $request->query('status', 'unknown');

        $messages = [
            'success' => 'Thank you — your payment was received and verified.',
            'failed' => 'We could not verify this payment. If you were charged, please contact support.',
            'cancelled' => 'The payment was cancelled.',
            'unknown' => 'Payment result unavailable.',
        ];

        return view('payments.result', ['message' => $messages[$status] ?? $messages['unknown']]);
    }
}
