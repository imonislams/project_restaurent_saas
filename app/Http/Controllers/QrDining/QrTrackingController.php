<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\DiningTrackingService;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\QrBrandingSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Customer order tracking: a page plus a lightweight JSON endpoint the screen
 * polls (matching the app's existing polling pattern — no websockets).
 */
class QrTrackingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $qr = $request->attributes->get('qr_token');
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return redirect()->route('qr.entry', ['token' => $qr->token]);
        }

        $participant = $this->participant($request, $session);
        $tenant = $request->attributes->get('qr_tenant');
        $branch = $request->attributes->get('qr_branch');
        $table = $request->attributes->get('qr_table');

        return Inertia::render('Qr/Tracking', [
            'token' => $qr->token,
            'restaurant' => ['name' => $tenant->name, 'branch' => $branch->name, 'logo_url' => $tenant->logo_url],
            'table' => ['id' => $table->getKey(), 'name' => $table->name],
            'branding' => app(QrBrandingSettings::class)->resolve($tenant, $branch),
            'participant_token' => $participant?->participant_token,
            'initial' => app(DiningTrackingService::class)->payload($session, $participant),
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return response()->json(['message' => 'No active dining session.'], 409);
        }

        $participant = $this->participant($request, $session);

        // Finalize any orders whose verified payments now cover the total.
        app(\App\Domain\Dining\QrPaymentService::class)->reconcileSession($session);

        return response()->json(app(DiningTrackingService::class)->payload($session, $participant));
    }

    protected function participant(Request $request, DiningSession $session): ?DiningParticipant
    {
        $token = $request->header('X-Dining-Participant');

        if ($token) {
            $found = $session->participants()->where('participant_token', $token)->first();

            if ($found) {
                return $found;
            }
        }

        return $session->participants()->latest('id')->first();
    }
}
