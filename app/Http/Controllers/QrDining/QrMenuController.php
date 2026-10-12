<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\QrDiningSettings;
use App\Domain\Menu\QrMenuService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renders the customer-facing digital menu for the active dining session.
 */
class QrMenuController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $qr = $request->attributes->get('qr_token');
        $session = $request->attributes->get('dining_session');

        if (! $session) {
            return redirect()->route('qr.entry', ['token' => $qr->token]);
        }

        $tenant = $request->attributes->get('qr_tenant');
        $branch = $request->attributes->get('qr_branch');
        $table = $request->attributes->get('qr_table');
        $settings = app(QrDiningSettings::class);

        $menu = app(QrMenuService::class)->forBranch($tenant, $branch);

        return Inertia::render('Qr/Menu', [
            'token' => $qr->token,
            'table' => ['id' => $table->getKey(), 'name' => $table->name],
            'session' => [
                'id' => $session->getKey(),
                'status' => $session->status->value,
                'billing_mode' => $session->billing_mode->value,
            ],
            'policy' => [
                'allow_additional_orders' => $settings->allowAdditionalOrders(),
                'allow_notes' => $settings->allowNotes(),
            ],
            ...$menu,
        ]);
    }
}
