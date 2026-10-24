<?php

namespace App\Http\Controllers\Payments;

use App\Domain\Billing\PlatformPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Provider-agnostic platform billing webhook. Unauthenticated: authenticity
 * rests on the provider signature (where supported) and server-side
 * verification inside PlatformPaymentService — never on the payload alone.
 */
class PlatformWebhookController extends Controller
{
    public function __construct(protected PlatformPaymentService $payments) {}

    public function __invoke(Request $request, string $provider): JsonResponse
    {
        $rawBody = $request->getContent();
        $data = json_decode($rawBody, true);

        if (! is_array($data)) {
            return response()->json(['error' => 'Invalid payload'], 422);
        }

        $headers = collect($request->headers->all())
            ->mapWithKeys(fn ($values, $key) => [strtolower((string) $key) => is_array($values) ? (string) ($values[0] ?? '') : (string) $values])
            ->all();

        $outcome = $this->payments->handleNotification($provider, $data, $rawBody, $headers);

        return response()->json([
            'received' => true,
            'processed' => $outcome['processed'],
            'duplicate' => $outcome['duplicate'],
            'reason' => $outcome['reason'],
        ], $outcome['reason'] === 'Signature verification failed' ? 401 : 200);
    }
}
