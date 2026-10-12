<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\QrPaymentService;
use App\Http\Controllers\Controller;
use App\Http\Controllers\QrDining\Concerns\ResolvesDiningSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Customer payment: initiate an online payment for an order and poll its
 * authoritative status. Never reports success the server has not verified.
 */
class QrPaymentController extends Controller
{
    use ResolvesDiningSession;

    public function start(Request $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return response()->json(['message' => 'No active dining session.'], 409);
        }

        $validated = $request->validate([
            'order_id' => ['required', 'integer'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
        ]);

        $order = $session->orders()->findOrFail($validated['order_id']);

        abort_if($order->status->value === 'voided', 422, 'This order was cancelled.');

        $result = app(QrPaymentService::class)->startOnline($order, $validated['idempotency_key'] ?? null);

        return response()->json(['payment' => $result]);
    }

    public function status(Request $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return response()->json(['message' => 'No active dining session.'], 409);
        }

        $order = $session->orders()->findOrFail($request->integer('order_id'));

        app(QrPaymentService::class)->reconcile($order);
        $order->refresh();

        return response()->json([
            'order_id' => $order->getKey(),
            'status' => $order->status->value,
            'paid_total' => (float) $order->paid_total,
            'total' => (float) $order->total,
            'payments' => $order->payments()->get()->map(fn ($payment) => [
                'status' => $payment->status->value,
                'reference' => $payment->reference,
                'amount' => (float) $payment->amount,
            ]),
        ]);
    }
}
