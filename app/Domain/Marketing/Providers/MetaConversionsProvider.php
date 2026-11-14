<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\DispatchesMarketingEvents;
use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingIntegration;
use App\Domain\Marketing\Support\MatchHasher;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta Conversions API: server-side event delivery.
 *
 * Two guarantees live here:
 *
 *  1. Deduplication — every event carries the same `event_id` as its browser
 *     counterpart, so Meta collapses the pair instead of counting it twice, and our
 *     own retries are keyed on it too.
 *  2. Data minimisation — only hashed match keys derived from the platform's own
 *     lead are sent. A restaurant's customers, staff and orders are never included;
 *     see docs/marketing/SECURITY.md §5.
 */
class MetaConversionsProvider implements DispatchesMarketingEvents, MarketingProvider
{
    public const GRAPH_VERSION = 'v21.0';

    public function key(): string
    {
        return 'meta_conversions';
    }

    public function label(): string
    {
        return 'Meta Conversions API';
    }

    public function capabilities(): array
    {
        return ['conversions', 'test_events'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        $credentials = $integration->credentials ?? [];
        $pixelId = (string) ($credentials['pixel_id'] ?? '');
        $token = (string) ($credentials['access_token'] ?? '');

        if ($pixelId === '' || $token === '') {
            return ['ok' => false, 'error' => 'A pixel id and an access token are both required.', 'detail' => []];
        }

        try {
            $response = Http::timeout(15)->get($this->baseUrl($pixelId), [
                'fields' => 'id,name',
                'access_token' => $token,
            ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach Meta: '.$e->getMessage(), 'detail' => []];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message'), $response->body()),
                'detail' => ['http_status' => $response->status()],
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'pixel_id' => $response->json('id') ?? $pixelId,
                'pixel_name' => $response->json('name'),
                'http_status' => $response->status(),
            ],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        return [
            'pixel_id' => (string) ($integration->credentials['pixel_id'] ?? ''),
            'business_id' => (string) ($integration->credentials['business_id'] ?? ''),
            'test_event_code' => $this->testEventCode($integration) ?? '(none — events count towards reporting)',
            'tracked_events' => $integration->settings['events'] ?? [],
            'match_keys_sent' => 'hashed email, phone, name, city and country from the platform lead',
        ];
    }

    public function dispatchEvent(MarketingIntegration $integration, MarketingEvent $event): array
    {
        $metaName = $event->name->metaEventName();

        if ($metaName === null) {
            return ['ok' => false, 'skipped' => true, 'reason' => 'Meta has no equivalent for '.$event->name->value.'.', 'error' => null];
        }

        $credentials = $integration->credentials ?? [];
        $pixelId = (string) ($credentials['pixel_id'] ?? '');
        $token = (string) ($credentials['access_token'] ?? '');

        if ($pixelId === '' || $token === '') {
            return ['ok' => false, 'error' => 'The Conversions API is missing its pixel id or access token.'];
        }

        $payload = [
            'data' => [$this->buildEventPayload($metaName, $event)],
            'access_token' => $token,
        ];

        $testCode = $this->testEventCode($integration);

        if ($testCode !== null) {
            $payload['test_event_code'] = $testCode;
        }

        try {
            $response = Http::timeout(20)->asJson()->post($this->baseUrl($pixelId).'/events', $payload);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach Meta: '.$e->getMessage()];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'response' => $response->body(),
                'error' => $this->describeFailure($response->status(), $response->json('error.message'), $response->body()),
            ];
        }

        $received = (int) ($response->json('events_received') ?? 0);

        return [
            'ok' => true,
            'http_status' => $response->status(),
            'response' => $response->body(),
            'error' => null,
            'detail' => ['events_received' => $received],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildEventPayload(string $metaEventName, MarketingEvent $event): array
    {
        $payload = [
            'event_name' => $metaEventName,
            'event_time' => $event->occurred_at?->timestamp ?? time(),
            // The dedupe key, shared with the browser pixel.
            'event_id' => $event->event_id,
            'action_source' => 'website',
        ];

        if ($event->url !== null) {
            $payload['event_source_url'] = $event->url;
        }

        $userData = $this->matchKeys($event);

        if ($userData !== []) {
            $payload['user_data'] = $userData;
        }

        $customData = array_filter([
            'value' => $event->value !== null ? (float) $event->value : null,
            'currency' => $event->currency,
            'content_name' => $event->properties['plan'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        if ($customData !== []) {
            $payload['custom_data'] = $customData;
        }

        return $payload;
    }

    /**
     * Hashed match keys, taken only from the platform's own lead record. No
     * restaurant end-customer data is ever included.
     *
     * @return array<string, mixed>
     */
    protected function matchKeys(MarketingEvent $event): array
    {
        $lead = $event->lead;

        $userData = array_filter([
            'em' => $lead ? MatchHasher::email($lead->email) : null,
            'ph' => $lead ? MatchHasher::phone($lead->phone) : null,
            'country' => MatchHasher::place($lead?->country),
            'ct' => MatchHasher::place($lead?->city),
        ], fn ($value) => $value !== null);

        if ($lead && $lead->name) {
            $userData = array_filter(array_merge($userData, MatchHasher::splitName($lead->name)));
        }

        return $userData;
    }

    protected function testEventCode(MarketingIntegration $integration): ?string
    {
        $code = trim((string) ($integration->credentials['test_event_code'] ?? ''));

        return $code === '' ? null : $code;
    }

    protected function baseUrl(string $pixelId): string
    {
        return 'https://graph.facebook.com/'.self::GRAPH_VERSION.'/'.$pixelId;
    }

    /**
     * Turn a provider failure into something an operator can act on, without
     * echoing the access token that produced it.
     */
    protected function describeFailure(int $status, ?string $message, string $body): string
    {
        $message = $message ?? '';

        if (str_contains($message, 'expired') || str_contains($body, 'OAuthException') || $status === 401) {
            return 'Meta rejected the access token: '.($message !== '' ? $message : 'the token is invalid or expired').' Reconnect with a fresh token.';
        }

        if ($status === 429 || str_contains($message, 'rate limit')) {
            return 'Meta rate limited the request: '.($message !== '' ? $message : 'try again shortly').'';
        }

        if ($status === 403) {
            return 'Meta refused the request: '.($message !== '' ? $message : 'the token lacks permission for this pixel').'';
        }

        Log::warning('Meta Conversions API request failed.', ['status' => $status]);

        return 'Meta returned HTTP '.$status.($message !== '' ? ': '.$message : '.');
    }
}
