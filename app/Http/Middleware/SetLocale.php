<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the request locale from, in order: an explicit session choice, the
 * user's preference, then the tenant's regional setting — falling back to the
 * app default. Never trusts a client-supplied locale.
 */
class SetLocale
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get('locale')
            ?? $request->user()?->locale
            ?? $this->context->tenant()?->getSetting('region.locale')
            ?? config('app.locale');

        if ($this->supported($locale)) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    protected function supported(?string $locale): bool
    {
        return $locale !== null && array_key_exists($locale, config('app.locales', ['en' => 'English']));
    }
}
