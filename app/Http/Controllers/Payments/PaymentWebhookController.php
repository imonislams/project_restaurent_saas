<?php

namespace App\Http\Controllers\Payments;

use App\Domain\Payments\WebhookService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, WebhookService $webhooks): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Signature') ?? $request->header('X-Webhook-Signature');
        $data = json_decode($payload, true);

        if (! is_array($data)) {
            // SSLCommerz and bKash post form-encoded IPNs, not JSON.
            $data = $request->all();
            $payload = json_encode($data) ?: '';
        }

        if ($data === []) {
            return response()->json(['error' => 'Invalid payload'], 422);
        }

        // Deduplicate on the provider's own id when it sends one, else on the body:
        // a null event id would make every later notification look like a duplicate.
        $data['event_id'] ??= $data['id']
            ?? $data['val_id']
            ?? $data['bank_tran_id']
            ?? $data['tran_id']
            ?? $data['paymentID']
            ?? 'sha1:'.sha1($payload);

        $event = $webhooks->handle($provider, $payload, $signature, $data);

        return response()->json([
            'received' => true,
            'valid' => $event->signature_valid,
            'duplicate' => ! $event->wasRecentlyCreated,
        ], $event->signature_valid ? 200 : 401);
    }
}
