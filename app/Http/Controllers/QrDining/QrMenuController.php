<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\CustomerStatusMapper;
use App\Domain\Dining\DiningAuthorization;
use App\Domain\Dining\QrBrandingSettings;
use App\Domain\Dining\QrDiningSettings;
use App\Domain\Menu\QrMenuService;
use App\Domain\Orders\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renders the customer-facing digital menu for the active dining session.
 *
 * Also exposes which of the table's orders are still eligible for tracking so
 * the "Track order" affordance survives navigation and reloads (the state is
 * derived server-side from the dining session, never from client memory).
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
            'branding' => app(QrBrandingSettings::class)->resolve($tenant, $branch),
            'session' => [
                'id' => $session->getKey(),
                'status' => $session->status->value,
                'billing_mode' => $session->billing_mode->value,
            ],
            'policy' => [
                'allow_additional_orders' => $settings->allowAdditionalOrders(),
                'allow_notes' => $settings->allowNotes(),
            ],
            'tracking' => $this->tracking($request, $session),
            ...$menu,
        ]);
    }

    /**
     * Eligible (non-terminal) orders this device is allowed to track.
     *
     * @return array{available: bool, orders: list<array<string, mixed>>}
     */
    protected function tracking(Request $request, $session): array
    {
        $participant = null;

        if ($token = $request->header('X-Dining-Participant')) {
            $participant = $session->participants()->where('participant_token', $token)->first();
        }

        $mapper = app(CustomerStatusMapper::class);

        $orders = app(DiningAuthorization::class)
            ->ordersQuery($session, $participant)
            ->with('kitchenTicket')
            ->latest('id')
            ->get()
            ->reject(fn ($order) => in_array($order->status, [OrderStatus::Completed, OrderStatus::Voided], true))
            ->map(function ($order) use ($mapper) {
                $status = $mapper->map($order);

                return [
                    'id' => $order->getKey(),
                    'number' => $order->order_number,
                    'status_key' => $status['key'],
                    'status_label' => $status['label'],
                ];
            })
            ->values()
            ->all();

        return [
            'available' => $orders !== [],
            'orders' => $orders,
        ];
    }
}
