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
            return response()->json(['error' => 'Invalid payload'], 422);
        }

        $event = $webhooks->handle($provider, $payload, $signature, $data);

        return response()->json([
            'received' => true,
            'valid' => $event->signature_valid,
            'duplicate' => ! $event->wasRecentlyCreated,
        ], $event->signature_valid ? 200 : 401);
    }
}
