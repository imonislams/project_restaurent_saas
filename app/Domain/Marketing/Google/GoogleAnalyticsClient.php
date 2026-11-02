<?php

namespace App\Domain\Marketing\Google;

use App\Domain\Marketing\Models\MarketingIntegration;
use Illuminate\Support\Facades\Http;

/**
 * GA4 Data API client (read-only reporting).
 */
class GoogleAnalyticsClient
{
    public const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

    protected const BASE = 'https://analyticsdata.googleapis.com/v1beta';

    public function __construct(protected GoogleConnection $connection) {}

    /** Accepts `properties/123`, `123` or a bare property id. */
    public function propertyId(MarketingIntegration $integration): ?string
    {
        $raw = trim((string) ($integration->credentials['property_id'] ?? ''));

        if ($raw === '') {
            return null;
        }

        $id = preg_replace('#^properties/#', '', $raw);

        return is_string($id) && $id !== '' ? $id : null;
    }

    /**
     * @param  list<array{name: string}>  $metrics
     * @param  list<array{name: string}>  $dimensions
     * @return array{ok: bool, error: ?string, rows: list<array<string, mixed>>, totals: array<string, mixed>, http_status: ?int}
     */
    public function runReport(
        MarketingIntegration $integration,
        string $from,
        string $to,
        array $metrics,
        array $dimensions = [],
        int $limit = 100,
    ): array {
        $propertyId = $this->propertyId($integration);

        if ($propertyId === null) {
            return ['ok' => false, 'error' => 'No GA4 property id is configured.', 'rows' => [], 'totals' => [], 'http_status' => null];
        }

        $token = $this->connection->accessToken($integration, self::SCOPES);

        if (! $token['ok']) {
            return ['ok' => false, 'error' => $token['error'], 'rows' => [], 'totals' => [], 'http_status' => null];
        }

        $body = [
            'dateRanges' => [['startDate' => $from, 'endDate' => $to]],
            'metrics' => $metrics,
            'limit' => $limit,
        ];

        if ($dimensions !== []) {
            $body['dimensions'] = $dimensions;
        }

        try {
            $response = Http::withToken((string) $token['token'])
                ->timeout(30)
                ->post(self::BASE.'/properties/'.$propertyId.':runReport', $body);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach the GA4 Data API: '.$e->getMessage(), 'rows' => [], 'totals' => [], 'http_status' => null];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message')),
                'rows' => [],
                'totals' => [],
                'http_status' => $response->status(),
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'rows' => $this->rows($response->json('rows') ?? [], $dimensions, $metrics),
            'totals' => $this->totals($response->json('totals') ?? $response->json('rows.0.metricValues') ?? []),
            'http_status' => $response->status(),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<array{name: string}>  $dimensions
     * @param  list<array{name: string}>  $metrics
     * @return list<array<string, mixed>>
     */
    protected function rows(array $rows, array $dimensions, array $metrics): array
    {
        $shaped = [];

        foreach ($rows as $row) {
            $entry = [];

            foreach ($dimensions as $index => $dimension) {
                $entry[$dimension['name']] = $row['dimensionValues'][$index]['value'] ?? null;
            }

            foreach ($metrics as $index => $metric) {
                $raw = $row['metricValues'][$index]['value'] ?? null;
                $entry[$metric['name']] = is_numeric($raw) ? (float) $raw : $raw;
            }

            $shaped[] = $entry;
        }

        return $shaped;
    }

    /**
     * @param  list<array<string, mixed>>  $row
     * @return array<string, mixed>
     */
    protected function totals(array $row): array
    {
        $values = $row['metricValues'] ?? [];

        return collect($values)
            ->mapWithKeys(fn (array $value, int $index) => ['metric_'.$index => is_numeric($value['value'] ?? null) ? (float) $value['value'] : ($value['value'] ?? null)])
            ->all();
    }

    protected function describeFailure(int $status, ?string $message): string
    {
        $message = (string) ($message ?? '');

        return match (true) {
            $status === 401 => 'Google rejected the access token. Reconnect the Google account.',
            $status === 403 => 'This account cannot read that GA4 property'.($message !== '' ? ': '.$message : '. Check that the property id is right and that the account has access.'),
            $status === 404 => 'GA4 has no such property'.($message !== '' ? ': '.$message : '.'),
            $status === 429 => 'The GA4 Data API quota for this property was exceeded. Try again later.',
            default => 'The GA4 Data API returned HTTP '.$status.($message !== '' ? ': '.$message : '.'),
        };
    }
}
