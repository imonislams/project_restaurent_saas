<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\Models\DiningFeedback;
use App\Domain\Dining\QrDiningSettings;
use App\Http\Controllers\Controller;
use App\Http\Controllers\QrDining\Concerns\ResolvesDiningSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Post-dining feedback. Resolves the session of any status (feedback normally
 * arrives after the session has closed).
 */
class QrFeedbackController extends Controller
{
    use ResolvesDiningSession;

    public function store(Request $request): JsonResponse
    {
        abort_unless(app(QrDiningSettings::class)->feedbackEnabled(), 403, 'Feedback is disabled.');

        $session = $this->diningSessionFromRequest($request);

        if (! $session) {
            return response()->json(['message' => 'No dining session found.'], 409);
        }

        $participant = $this->participantForRequest($request, $session);

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'consent_marketing' => ['boolean'],
        ]);

        DiningFeedback::updateOrCreate(
            ['tenant_id' => $session->tenant_id, 'dining_session_id' => $session->getKey()],
            [
                'customer_id' => $participant?->customer_id,
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
                'consent_marketing' => (bool) ($validated['consent_marketing'] ?? false),
                'created_at' => now(),
            ],
        );

        return response()->json(['ok' => true]);
    }
}
