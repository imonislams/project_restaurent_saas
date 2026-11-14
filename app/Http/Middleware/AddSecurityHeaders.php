<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds conservative security headers to every response.
 */
class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        // The app uses no camera, microphone or geolocation, so deny them outright.
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        );

        // HSTS only over HTTPS: sending it on plain HTTP is ignored, and pinning it
        // from a local HTTP origin would lock browsers out of a working dev host.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        if ($policy = $this->contentSecurityPolicy()) {
            $header = config('app.csp_report_only', true)
                ? 'Content-Security-Policy-Report-Only'
                : 'Content-Security-Policy';

            $response->headers->set($header, $policy);
        }

        return $response;
    }

    /**
     * Content-Security-Policy for the Inertia shell.
     *
     * Shipped as Report-Only by default so violations are observable without
     * breaking the app; set CSP_REPORT_ONLY=false to enforce once the report is
     * clean. 'unsafe-inline' is still required for style-src because Radix and the
     * print/QR views set inline style attributes, and for script-src because Vite's
     * dev client and Ziggy's route helper inject inline script. Those are the two
     * things to remove with nonces if this is tightened further.
     *
     * Empty Csp-Policy config disables the header entirely.
     */
    protected function contentSecurityPolicy(): ?string
    {
        if (! config('app.csp_enabled', true)) {
            return null;
        }

        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https: wss:",
            "frame-src 'self' https://js.stripe.com",
        ]);
    }
}
