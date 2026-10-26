<?php

namespace App\Http\Middleware;

use App\Domain\Installer\InstallState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks the setup wizard once the application has been installed, so the
 * installer cannot be reached (or re-run) after go-live.
 */
class EnsureNotInstalled
{
    public function __construct(protected InstallState $state) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->state->isInstalled()) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
