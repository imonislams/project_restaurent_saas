<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\DiningReceiptService;
use App\Domain\Dining\QrDiningSettings;
use App\Http\Controllers\Controller;
use App\Http\Controllers\QrDining\Concerns\ResolvesDiningSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public QR entry point. Resolves the restaurant/table context and either
 * continues an active session, shows the closed-session (thank-you) screen, or
 * presents the entry policy before a session is started.
 */
class QrEntryController extends Controller
{
    use ResolvesDiningSession;

    public function show(Request $request): Response|RedirectResponse
    {
        $qr = $request->attributes->get('qr_token');
        $table = $request->attributes->get('qr_table');
        $tenant = $request->attributes->get('qr_tenant');
        $branch = $request->attributes->get('qr_branch');
        $settings = app(QrDiningSettings::class);

        $restaurant = ['name' => $tenant->name, 'branch' => $branch->name, 'logo_url' => $tenant->logo_url];
        $tableInfo = ['id' => $table->getKey(), 'name' => $table->name];

        $session = $this->diningSessionFromRequest($request);

        if ($session && $session->isActive() && ! $session->isExpired()) {
            return redirect()->route('qr.menu', ['token' => $qr->token]);
        }

        if ($session && $session->isClosed()) {
            return Inertia::render('Qr/Closed', [
                'token' => $qr->token,
                'restaurant' => $restaurant,
                'table' => $tableInfo,
                'receipt' => app(DiningReceiptService::class)->forSession($session),
                'feedback_enabled' => $settings->feedbackEnabled(),
                'feedback' => $session->feedback ? [
                    'rating' => $session->feedback->rating,
                    'comment' => $session->feedback->comment,
                ] : null,
            ]);
        }

        return Inertia::render('Qr/Entry', [
            'token' => $qr->token,
            'restaurant' => $restaurant,
            'table' => $tableInfo,
            'enabled' => $settings->enabled() && $settings->branchEnabled($branch->getKey()),
            'policy' => [
                'guest_checkout' => $settings->guestCheckout(),
                'require_phone' => $settings->requirePhone(),
                'require_email' => $settings->requireEmail(),
            ],
        ]);
    }
}
