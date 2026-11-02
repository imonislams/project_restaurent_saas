<?php

namespace App\Domain\Marketing\Google;

use App\Domain\Marketing\Models\MarketingIntegration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Mints Google access tokens for GA4, Search Console and Google Ads.
 *
 * Two credential styles are supported, because they suit different operators:
 *
 *  - **OAuth 2.0** — authorization-code flow; the refresh token is stored encrypted
 *    and exchanged for access tokens on demand. Suits Google Ads, which requires a
 *    real user, and anyone who prefers a consent screen.
 *  - **Service account** — a JSON key signs a JWT assertion. No redirect URI and no
 *    re-authorisation, and the service-account address is simply added as a user on
 *    the GA4 property or Search Console site.
 *
 * Access tokens are cached until shortly before they expire, and a rejected refresh
 * token surfaces as `invalid_grant` so the operator is told to reconnect rather than
 * left with a silent empty report.
 */
class GoogleConnection
{
    public const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

    public const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

    /** Refresh five minutes early so a token cannot expire mid-request. */
    protected const EXPIRY_SKEW_SECONDS = 300;

    public function authMode(MarketingIntegration $integration): string
    {
        $mode = strtolower(trim((string) ($integration->credentials['auth_mode'] ?? '')));

        if (in_array($mode, ['oauth', 'service_account'], true)) {
            return $mode;
        }

        // Infer from what was actually supplied.
        if (trim((string) ($integration->credentials['service_account_json'] ?? '')) !== '') {
            return 'service_account';
        }

        return 'oauth';
    }

    public function hasCredentials(MarketingIntegration $integration): bool
    {
        $credentials = $integration->credentials ?? [];

        if ($this->authMode($integration) === 'service_account') {
            return trim((string) ($credentials['service_account_json'] ?? '')) !== '';
        }

        return trim((string) ($credentials['refresh_token'] ?? '')) !== ''
            && trim((string) ($credentials['client_id'] ?? '')) !== ''
            && trim((string) ($credentials['client_secret'] ?? '')) !== '';
    }

    public function redirectUri(): string
    {
        return url('/platform/marketing/integrations/google/callback');
    }

    /** @param list<string> $scopes */
    public function authorizationUrl(MarketingIntegration $integration, string $state, array $scopes, bool $offline = true): string
    {
        $query = [
            'client_id' => (string) ($integration->credentials['client_id'] ?? ''),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'access_type' => $offline ? 'offline' : 'online',
            // Without this Google returns a refresh token only on the very first
            // consent, which is the single most common OAuth setup mistake.
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ];

        return self::AUTHORIZATION_ENDPOINT.'?'.http_build_query($query);
    }

    /**
     * Exchange an authorization code and return the refresh token to store.
     *
     * @return array{ok: bool, refresh_token: ?string, error: ?string}
     */
    public function exchangeCode(MarketingIntegration $integration, string $code): array
    {
        $credentials = $integration->credentials ?? [];

        try {
            $response = Http::asForm()->timeout(20)->post(self::TOKEN_ENDPOINT, [
                'code' => $code,
                'client_id' => (string) ($credentials['client_id'] ?? ''),
                'client_secret' => (string) ($credentials['client_secret'] ?? ''),
                'redirect_uri' => $this->redirectUri(),
                'grant_type' => 'authorization_code',
            ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'refresh_token' => null, 'error' => 'Could not reach Google: '.$e->getMessage()];
        }

        if ($response->failed() || $response->json('refresh_token') === null) {
            $message = (string) ($response->json('error_description') ?? $response->json('error') ?? 'no refresh token was returned');

            return [
                'ok' => false,
                'refresh_token' => null,
                'error' => 'Google rejected the authorization: '.$message,
            ];
        }

        return ['ok' => true, 'refresh_token' => (string) $response->json('refresh_token'), 'error' => null];
    }

    /**
     * An access token for this integration, from cache when possible.
     *
     * @param  list<string>  $scopes
     * @return array{ok: bool, token: ?string, error: ?string}
     */
    public function accessToken(MarketingIntegration $integration, array $scopes = []): array
    {
        $cacheKey = 'marketing.google.token.'.$integration->getKey().'.'.md5(implode(' ', $scopes));

        $cached = Cache::get($cacheKey);

        if (is_string($cached) && $cached !== '') {
            return ['ok' => true, 'token' => $cached, 'error' => null];
        }

        $result = $this->authMode($integration) === 'service_account'
            ? $this->serviceAccountToken($integration, $scopes)
            : $this->refreshToken($integration, $scopes);

        if ($result['ok'] && $result['token'] !== null) {
            $ttl = max(60, (int) ($result['expires_in'] ?? 3600) - self::EXPIRY_SKEW_SECONDS);
            Cache::put($cacheKey, $result['token'], $ttl);
        }

        return ['ok' => $result['ok'], 'token' => $result['token'], 'error' => $result['error']];
    }

    public function forgetToken(MarketingIntegration $integration): void
    {
        foreach (['analytics.readonly', 'webmasters.readonly', 'adwords'] as $scope) {
            Cache::forget('marketing.google.token.'.$integration->getKey().'.'.md5($scope));
        }
    }

    /**
     * @param  list<string>  $scopes
     * @return array{ok: bool, token: ?string, error: ?string, expires_in: ?int}
     */
    protected function refreshToken(MarketingIntegration $integration, array $scopes): array
    {
        $credentials = $integration->credentials ?? [];

        try {
            $response = Http::asForm()->timeout(20)->post(self::TOKEN_ENDPOINT, [
                'client_id' => (string) ($credentials['client_id'] ?? ''),
                'client_secret' => (string) ($credentials['client_secret'] ?? ''),
                'refresh_token' => (string) ($credentials['refresh_token'] ?? ''),
                'grant_type' => 'refresh_token',
            ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'token' => null, 'error' => 'Could not reach Google: '.$e->getMessage(), 'expires_in' => null];
        }

        if ($response->failed() || $response->json('access_token') === null) {
            $error = (string) ($response->json('error') ?? '');
            $description = (string) ($response->json('error_description') ?? '');

            $message = match ($error) {
                'invalid_grant' => 'Google no longer accepts the stored refresh token (it was revoked, or the client changed). Reconnect the Google account.',
                'invalid_client' => 'Google rejected the OAuth client id or secret. Check both on the Integrations screen.',
                default => 'Google returned '.$response->status().($description !== '' ? ': '.$description : '.'),
            };

            Log::warning('Google refresh token exchange failed.', [
                'integration' => $integration->getKey(),
                'error' => $error !== '' ? $error : 'http_'.$response->status(),
            ]);

            return ['ok' => false, 'token' => null, 'error' => $message, 'expires_in' => null];
        }

        return [
            'ok' => true,
            'token' => (string) $response->json('access_token'),
            'error' => null,
            'expires_in' => (int) ($response->json('expires_in') ?? 3600),
        ];
    }

    /**
     * Sign a JWT assertion with the service-account private key and exchange it.
     *
     * @param  list<string>  $scopes
     * @return array{ok: bool, token: ?string, error: ?string, expires_in: ?int}
     */
    protected function serviceAccountToken(MarketingIntegration $integration, array $scopes): array
    {
        $raw = (string) ($integration->credentials['service_account_json'] ?? '');
        $account = json_decode($raw, true);

        if (! is_array($account) || ! isset($account['client_email'], $account['private_key'])) {
            return [
                'ok' => false,
                'token' => null,
                'error' => 'The service account JSON is missing client_email or private_key.',
                'expires_in' => null,
            ];
        }

        $now = time();
        $header = $this->base64Url((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT', 'kid' => $account['private_key_id'] ?? null]));
        $claims = $this->base64Url((string) json_encode(array_filter([
            'iss' => $account['client_email'],
            'scope' => implode(' ', $scopes),
            'aud' => self::TOKEN_ENDPOINT,
            'iat' => $now,
            'exp' => $now + 3600,
        ], fn ($value) => $value !== null)));

        $signature = '';
        $signingInput = $header.'.'.$claims;

        if (! openssl_sign($signingInput, $signature, (string) $account['private_key'], OPENSSL_ALGO_SHA256)) {
            return [
                'ok' => false,
                'token' => null,
                'error' => 'The service account private key could not be used to sign the assertion. Check that the JSON was pasted in full.',
                'expires_in' => null,
            ];
        }

        $assertion = $signingInput.'.'.$this->base64Url($signature);

        try {
            $response = Http::asForm()->timeout(20)->post(self::TOKEN_ENDPOINT, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
            ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'token' => null, 'error' => 'Could not reach Google: '.$e->getMessage(), 'expires_in' => null];
        }

        if ($response->failed() || $response->json('access_token') === null) {
            $description = (string) ($response->json('error_description') ?? $response->json('error') ?? '');

            return [
                'ok' => false,
                'token' => null,
                'error' => 'Google rejected the service account: '.($description !== '' ? $description : 'HTTP '.$response->status().'.'),
                'expires_in' => null,
            ];
        }

        return [
            'ok' => true,
            'token' => (string) $response->json('access_token'),
            'error' => null,
            'expires_in' => (int) ($response->json('expires_in') ?? 3600),
        ];
    }

    protected function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
