<?php

namespace App\Http\Controllers\Marketing;

use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Models\MarketingEmailSend;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;

/**
 * Open, click and unsubscribe endpoints for marketing email.
 *
 * All three are token-addressed and unauthenticated by necessity: a mail client fetches
 * the pixel and follows a link without a session. The token is the per-recipient UUID
 * on the delivery row, so it identifies one person's copy and nothing else.
 */
class EmailTrackingController extends Controller
{
    /** A 1×1 transparent GIF. */
    private const PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    public function open(Request $request, string $token, EmailMarketingService $emails): Response
    {
        $send = $this->sendFor($token);

        if ($send !== null) {
            $emails->recordOpen($send);
        }

        return response(base64_decode(self::PIXEL), 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    }

    public function click(Request $request, string $token, EmailMarketingService $emails): RedirectResponse
    {
        $target = (string) $request->query('u', '');

        $send = $this->sendFor($token);

        // Only absolute http(s) targets are followed: a tracking endpoint must never
        // become an open redirect to a javascript: or data: URL.
        if (preg_match('#^https?://#i', $target) !== 1) {
            abort(404);
        }

        if ($send !== null) {
            $emails->recordClick($send, $target);
        }

        return redirect()->away($target, 302);
    }

    public function unsubscribe(string $token, EmailMarketingService $emails): \Inertia\Response
    {
        $send = $this->sendFor($token);

        if ($send === null) {
            return Inertia::render('Marketing/Unsubscribed', ['status' => 'invalid']);
        }

        // One click, no login. Honouring it immediately is the whole point.
        $emails->unsubscribe($token, 'link');

        return Inertia::render('Marketing/Unsubscribed', [
            'status' => 'unsubscribed',
            'email' => $send->email,
        ]);
    }

    protected function sendFor(string $token): ?MarketingEmailSend
    {
        // The pixel URL ends in .gif; the token itself is a UUID.
        $token = preg_replace('/\.gif$/i', '', $token) ?? $token;

        if (preg_match('/^[0-9a-f-]{36}$/i', $token) !== 1) {
            return null;
        }

        return MarketingEmailSend::query()->where('token', $token)->first();
    }
}
