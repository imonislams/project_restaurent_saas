<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Billing\Models\PlatformPaymentEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GatewayEventController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'provider' => $request->string('provider')->toString(),
            'processed' => $request->string('processed')->toString(),
        ];

        return Inertia::render('Platform/Payments/Webhooks', [
            'events' => PlatformPaymentEvent::query()
                ->with('tenant:id,name')
                ->when($filters['provider'] !== '', fn ($q) => $q->where('provider', $filters['provider']))
                ->when($filters['processed'] !== '', fn ($q) => $q->where('processed', $filters['processed'] === 'yes'))
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (PlatformPaymentEvent $event) => [
                    'id' => $event->getKey(),
                    'provider' => $event->provider,
                    'event_type' => $event->event_type,
                    'event_id' => $event->event_id,
                    'tenant' => $event->tenant?->name,
                    'signature_valid' => $event->signature_valid,
                    'processed' => $event->processed,
                    'note' => $event->note,
                    'created_at' => $event->created_at?->toIso8601String(),
                ]),
            'filters' => $filters,
            'stats' => [
                'total' => PlatformPaymentEvent::query()->count(),
                'processed' => PlatformPaymentEvent::query()->where('processed', true)->count(),
                'invalid' => PlatformPaymentEvent::query()->where('signature_valid', false)->count(),
            ],
        ]);
    }
}
