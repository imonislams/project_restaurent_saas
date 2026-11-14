<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects requests whose Host header is not an expected host.
 *
 * Absolute URLs generated for password resets, invitations and payment returns are
 * built from the request host. Without this check a forged Host header can be
 * reflected into a link that is then emailed to a victim, leaking their token
 * (QA-A-10). Trusting proxies (TRUSTED_PROXIES) fixes the forwarding half of that
 * problem; this fixes the direct half.
 *
 * Configured by ALLOWED_HOSTS. An empty list disables the check, which keeps local
 * development working but must not be left empty in production.
 */
class EnforceAllowedHosts
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = config('app.allowed_hosts', []);

        if ($allowed === []) {
            return $next($request);
        }

        $host = strtolower($request->getHost());

        foreach ($allowed as $pattern) {
            $pattern = strtolower(trim($pattern));

            if ($pattern === '') {
                continue;
            }

            // A leading dot (".example.com") matches subdomains; otherwise the
            // host must match exactly, so "example.com.attacker.test" is refused.
            if (str_starts_with($pattern, '.')) {
                $suffix = substr($pattern, 1);
                if ($host === $suffix || str_ends_with($host, $pattern)) {
                    return $next($request);
                }

                continue;
            }

            if ($host === $pattern) {
                return $next($request);
            }
        }

        abort(400, 'Unrecognised host.');
    }
}
