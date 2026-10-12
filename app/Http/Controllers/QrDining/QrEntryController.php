<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\QrDiningSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public QR entry point: shows the restaurant/table context and the entry
 * policy before a dining session is started.
 */
class QrEntryController extends Controller
{
    public function show(Request $request): Response
    {
        $qr = $request->attributes->get('qr_token');
        $table = $request->attributes->get('qr_table');
        $tenant = $request->attributes->get('qr_tenant');
        $branch = $request->attributes->get('qr_branch');
        $settings = app(QrDiningSettings::class);

        return Inertia::render('Qr/Entry', [
            'token' => $qr->token,
            'restaurant' => ['name' => $tenant->name, 'branch' => $branch->name],
            'table' => ['id' => $table->getKey(), 'name' => $table->name],
            'enabled' => $settings->enabled() && $settings->branchEnabled($branch->getKey()),
            'policy' => [
                'guest_checkout' => $settings->guestCheckout(),
                'require_phone' => $settings->requirePhone(),
                'require_email' => $settings->requireEmail(),
            ],
        ]);
    }
}
