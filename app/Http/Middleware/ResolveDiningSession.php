<?php

namespace App\Http\Middleware;

use App\Domain\Dining\DiningSessionService;
use App\Domain\Dining\Models\DiningSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current dining session from the HttpOnly session cookie and
 * binds it to the request. A cookie that belongs to another table, is closed or
 * has expired is ignored (and expired sessions are marked as such).
 */
class ResolveDiningSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $table = $request->attributes->get('qr_table');
        // Browsers carry the session in an HttpOnly cookie; programmatic clients
        // (and the customer SPA) may send it as a header instead.
        $token = $request->cookie('dining_session') ?: $request->header('X-Dining-Token');

        $session = $token ? DiningSession::query()->where('session_token', $token)->first() : null;

        if ($session && $table && (int) $session->table_id !== (int) $table->getKey()) {
            $session = null;
        }

        if ($session && $session->isActive() && $session->isExpired()) {
            app(DiningSessionService::class)->expire($session);
            $session = null;
        }

        if ($session && $session->isActive()) {
            $request->attributes->set('dining_session', $session);
        }

        return $next($request);
    }
}
