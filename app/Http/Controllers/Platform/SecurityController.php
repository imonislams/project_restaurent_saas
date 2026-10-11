<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Security\Models\SecurityEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'event' => $request->string('event')->toString(),
            'search' => $request->string('search')->toString(),
        ];

        return Inertia::render('Platform/Security/Events', [
            'events' => SecurityEvent::query()
                ->with('user:id,name')
                ->when($filters['event'] !== '', fn ($q) => $q->where('event', $filters['event']))
                ->when($filters['search'] !== '', fn ($q) => $q->where('email', 'like', '%'.$filters['search'].'%')->orWhere('ip', 'like', '%'.$filters['search'].'%'))
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (SecurityEvent $event) => [
                    'id' => $event->getKey(),
                    'event' => $event->event,
                    'user' => $event->user?->name,
                    'email' => $event->email,
                    'ip' => $event->ip,
                    'user_agent' => $event->user_agent,
                    'meta' => $event->meta,
                    'created_at' => $event->created_at?->toIso8601String(),
                ]),
            'stats' => [
                'logins_24h' => SecurityEvent::query()->where('event', 'login')->where('created_at', '>=', now()->subDay())->count(),
                'failed_24h' => SecurityEvent::query()->where('event', 'login_failed')->where('created_at', '>=', now()->subDay())->count(),
                'total' => SecurityEvent::query()->count(),
            ],
            'filters' => $filters,
            'events_list' => SecurityEvent::query()->distinct()->orderBy('event')->pluck('event')->all(),
        ]);
    }
}
