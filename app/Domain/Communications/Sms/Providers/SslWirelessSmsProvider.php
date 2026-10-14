<?php

namespace App\Domain\Communications\Sms\Providers;

use App\Domain\Communications\Sms\Contracts\SmsProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * SSL Wireless (Bangladesh) SMS Plus v3 driver.
 *
 * @see https://smsplus.sslwireless.com
 */
class SslWirelessSmsProvider implements SmsProvider
{
    /** @param array<string, mixed> $credentials */
    public function __construct(protected array $credentials = []) {}

    public function name(): string
    {
        return 'ssl_wireless';
    }

    public function send(string $to, string $message): array
    {
        $endpoint = (string) ($this->credentials['endpoint'] ?? 'https://smsplus.sslwireless.com/api/v3/send-sms');

        try {
            $response = Http::asForm()->timeout(15)->post($endpoint, [
                'api_token' => (string) ($this->credentials['api_token'] ?? ''),
                'sid' => (string) ($this->credentials['sid'] ?? ''),
                'msisdn' => ltrim($to, '+'),
                'sms' => $message,
                'csms_id' => (string) Str::uuid(),
            ]);

            $data = $response->json() ?? [];

            return [
                'ok' => $response->successful(),
                'reference' => $data['sms_id'] ?? null,
                'error' => $response->successful() ? null : ($data['status'] ?? $response->body()),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'reference' => null, 'error' => $e->getMessage()];
        }
    }
}
