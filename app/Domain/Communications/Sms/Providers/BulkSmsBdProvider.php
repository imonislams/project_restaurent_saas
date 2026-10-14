<?php

namespace App\Domain\Communications\Sms\Providers;

use App\Domain\Communications\Sms\Contracts\SmsProvider;
use Illuminate\Support\Facades\Http;

/**
 * BulkSMSBD (Bangladesh) driver.
 *
 * @see https://bulksmsbd.net
 */
class BulkSmsBdProvider implements SmsProvider
{
    /** @param array<string, mixed> $credentials */
    public function __construct(protected array $credentials = []) {}

    public function name(): string
    {
        return 'bulksmsbd';
    }

    public function send(string $to, string $message): array
    {
        $endpoint = (string) ($this->credentials['endpoint'] ?? 'https://bulksmsbd.net/api/smsapi');

        try {
            $response = Http::timeout(15)->get($endpoint, [
                'api_key' => (string) ($this->credentials['api_key'] ?? ''),
                'type' => 'text',
                'number' => ltrim($to, '+'),
                'senderid' => (string) ($this->credentials['sender_id'] ?? ''),
                'message' => $message,
            ]);

            $data = $response->json() ?? [];

            return [
                'ok' => $response->successful(),
                'reference' => $data['sms_id'] ?? $data['success'] ?? null,
                'error' => $response->successful() ? null : ($data['error_message'] ?? $response->body()),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'reference' => null, 'error' => $e->getMessage()];
        }
    }
}
