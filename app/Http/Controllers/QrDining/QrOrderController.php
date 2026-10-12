<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\DiningSessionService;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\QrDiningOrderService;
use App\Http\Controllers\Controller;
use App\Http\Requests\QrDining\QrOrderRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public order submission for a dining session. Returns JSON so the customer
 * app can update in place without a full page reload.
 */
class QrOrderController extends Controller
{
    public function store(QrOrderRequest $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return response()->json(['message' => 'No active dining session.'], 409);
        }

        $participant = $this->participantFor($request, $session);
        $order = app(QrDiningOrderService::class)->place($session, $participant, $request->validated());

        return response()->json([
            'order' => [
                'id' => $order->getKey(),
                'number' => $order->order_number,
                'status' => $order->status->value,
                'acceptance_status' => $order->acceptance_status->value,
                'total' => (float) $order->total,
                'currency' => $order->currency,
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'line_total' => (float) $item->line_total,
                    'modifiers' => $item->modifiers->map(fn ($m) => $m->name)->all(),
                ]),
            ],
        ], 201);
    }

    protected function participantFor(Request $request, DiningSession $session): DiningParticipant
    {
        $token = $request->header('X-Dining-Participant');

        if ($token) {
            $participant = $session->participants()->where('participant_token', $token)->first();

            if ($participant) {
                return $participant;
            }
        }

        return $session->participants()->latest('id')->first()
            ?? app(DiningSessionService::class)->addParticipant($session, []);
    }
}
