<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\DiningSessionService;
use App\Domain\Dining\QrDiningSettings;
use App\Http\Controllers\Controller;
use App\Http\Controllers\QrDining\Concerns\ResolvesDiningSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Customer-initiated bill request (configurable per tenant).
 */
class QrBillController extends Controller
{
    use ResolvesDiningSession;

    public function store(Request $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return response()->json(['message' => 'No active dining session.'], 409);
        }

        abort_unless(app(QrDiningSettings::class)->allowBillRequest(), 403, 'Bill requests are disabled for this restaurant.');

        $participant = $this->participantForRequest($request, $session);
        $bill = app(DiningSessionService::class)->requestBill($session, $participant);

        return response()->json([
            'bill' => [
                'status' => $bill->status->value,
                'requested_at' => $bill->requested_at?->toIso8601String(),
            ],
        ]);
    }
}
