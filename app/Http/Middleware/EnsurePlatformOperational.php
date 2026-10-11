<?php

namespace App\Http\Middleware;

use App\Domain\PlatformSettings\PlatformSettings;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks tenant traffic while platform maintenance mode is active, without
 * blocking the operations that must keep working (platform area, payment
 * callbacks, webhooks and health checks).
 */
class EnsurePlatformOperational
{
    public function handle(Request $request, Closure $next): Response
    {
        $settings = app(PlatformSettings::class);

        if (! $settings->get('maintenance.enabled', false)) {
            return $next($request);
        }

        $endsAt = $settings->get('maintenance.ends_at');

        // Auto-expire maintenance mode once the planned window has passed.
        if ($endsAt && Carbon::parse($endsAt)->isPast()) {
            return $next($request);
        }

        if ($request->user()?->isPlatformAdmin()) {
            return $next($request);
        }

        // Financial/health operations must continue to protect correctness.
        if ($request->is('platform/*', 'health', 'up', 'webhooks/*', 'payments/*', 'maintenance')) {
            return $next($request);
        }

        return response()->view('maintenance', [
            'message' => $settings->get('maintenance.message', 'We are performing scheduled maintenance. Please try again shortly.'),
            'endsAt' => $endsAt,
        ], 503);
    }
}
