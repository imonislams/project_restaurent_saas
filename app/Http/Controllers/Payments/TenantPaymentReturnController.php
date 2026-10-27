<?php

namespace App\Http\Controllers\Payments;

use App\Domain\Dining\QrPaymentService;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\WebhookService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Where SSLCommerz returns the diner's browser after a tenant payment.
 *
 * The provider POSTs (it does not redirect with GET) and the diner's tracking
 * page is a GET page, so this receives the POST, settles the payment through the
 * same verified, idempotent notification path as the IPN, then forwards the diner
 * to their own tracking page.
 */
class TenantPaymentReturnController extends Controller
{
    public function __invoke(Request $request, string $provider, string $result, WebhookService $webhooks): RedirectResponse
    {
        $payload = $request->all();
        $reference = $payload['tran_id'] ?? $payload['reference'] ?? null;

        if ($result === 'success' && $payload !== []) {
            try {
                $payload['event_id'] = $payload['event_id']
                    ?? $payload['val_id']
                    ?? $payload['bank_tran_id']
                    ?? $payload['tran_id']
                    ?? 'sha1:'.sha1((string) json_encode($request->all()));

                $webhooks->handle($provider, json_encode($payload) ?: '', null, $payload);

                // Finalize the order (idempotent) once the payment is verified.
                $payment = $reference ? Payment::withoutGlobalScopes()->where('reference', $reference)->first() : null;

                if ($payment && $payment->status === PaymentStatus::Succeeded && $payment->order) {
                    app(QrPaymentService::class)->reconcile($payment->order);
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return redirect($this->trackingUrl($reference));
    }

    /** The diner's tracking page for this payment, when it can be resolved. */
    protected function trackingUrl(?string $reference): string
    {
        $payment = $reference ? Payment::withoutGlobalScopes()->where('reference', $reference)->first() : null;
        $token = $payment?->order?->diningSession?->qrToken();

        return $token ? route('qr.tracking', ['token' => $token]) : url('/');
    }
}
