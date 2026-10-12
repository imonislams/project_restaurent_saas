<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\DiningSessionService;
use App\Domain\Dining\QrDiningSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Starts (or joins) the dining session for a table and manages its cookie.
 */
class QrSessionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $qr = $request->attributes->get('qr_token');
        $branch = $request->attributes->get('qr_branch');
        $settings = app(QrDiningSettings::class);

        abort_unless(
            $settings->enabled() && $settings->branchEnabled($branch->getKey()),
            403,
            'QR ordering is currently unavailable for this restaurant.'
        );

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:190'],
            'marketing_consent' => ['boolean'],
            'loyalty_consent' => ['boolean'],
        ]);

        $result = app(DiningSessionService::class)->startOrJoin($qr, $validated);

        return response()->json([
            'session_token' => $result['session']->session_token,
            'participant_token' => $result['participant']->participant_token,
            'redirect' => route('qr.menu', ['token' => $qr->token]),
        ])->withCookie(cookie(
            'dining_session',
            $result['session']->session_token,
            360,
            '/qr',
            null,
            $request->isSecure(),
            true,
            false,
            'lax',
        ));
    }

    public function destroy(Request $request): JsonResponse
    {
        $session = $request->attributes->get('dining_session');

        if ($session) {
            app(DiningSessionService::class)->close($session, 'customer_left');
        }

        return response()->json(['ok' => true])
            ->withCookie(cookie()->forget('dining_session', '/qr'));
    }
}
