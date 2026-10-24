<?php

namespace App\Http\Middleware;

use App\Domain\Billing\PricingRegionContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the visitor's pricing region for the public site, in order:
 *   1. a trusted CDN country header (Cloudflare / Vercel), when enabled;
 *   2. a browser-detected country cookie (used when the server cannot see the
 *      visitor's country — local dev or a host without a geo header);
 *   3. the configured default region (admin setting, then the platform's
 *      default currency — BDT ⇒ Bangladesh).
 *
 * Only the country is stored client-side and it is validated as a 2-letter
 * code. This affects display only — never billing or gateway eligibility, which
 * use the tenant's billing profile.
 */
class ResolvePricingRegion
{
    public function __construct(protected PricingRegionContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        [$country, $source] = $this->resolveCountry($request);

        $region = $country !== null
            ? $this->context->regionForCountry($country)
            : $this->context->defaultRegion();

        $this->context->set($region, $source, $country);

        return $next($request);
    }

    /** @return array{0: ?string, 1: string} */
    protected function resolveCountry(Request $request): array
    {
        if (config('platform.pricing.trust_country_header', true)) {
            $country = $this->countryFromHeaders($request);

            if ($country !== null) {
                return [$country, 'header'];
            }
        }

        $cookie = $request->cookie((string) config('platform.pricing.country_cookie', 'pricing_country'));

        if (is_string($cookie) && preg_match('/^[A-Za-z]{2}$/', $cookie) === 1) {
            return [strtoupper($cookie), 'detected'];
        }

        return [null, 'default'];
    }

    protected function countryFromHeaders(Request $request): ?string
    {
        foreach ((array) config('platform.pricing.country_headers', ['CF-IPCountry', 'X-Vercel-IP-Country']) as $header) {
            $value = $request->header((string) $header);

            if (is_string($value) && strlen(trim($value)) === 2) {
                return strtoupper(trim($value));
            }
        }

        return null;
    }
}
