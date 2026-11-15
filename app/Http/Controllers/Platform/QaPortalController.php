<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the generated QA audit portal to platform administrators.
 *
 * The portal is built by `php artisan qa:build-portal` into
 * storage/app/qa-portal.html — deliberately NOT public/. These reports enumerate
 * every unfixed vulnerability in the product, so serving them from the web root
 * would publish that list to anyone who guesses the filename, with no auth in
 * front of it.
 */
class QaPortalController extends Controller
{
    public function __invoke(): Response|BinaryFileResponse
    {
        $path = storage_path('app/qa-portal.html');

        abort_unless(is_file($path), 404, 'QA portal not built. Run: php artisan qa:build-portal');

        return response()->file($path, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store',
            // X-Frame-Options is deliberately not set here: AddSecurityHeaders
            // applies it globally, and setting it in both places just means one
            // silently wins depending on middleware order.
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
        ]);
    }
}
