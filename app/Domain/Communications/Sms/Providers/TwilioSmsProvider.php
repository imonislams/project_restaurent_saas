<?php

namespace App\Domain\Communications\Sms\Providers;

use App\Domain\Communications\Sms\Contracts\SmsProvider;
use Illuminate\Support\Facades\Http;

/**
 * Twilio Programmable SMS driver.
 */
class TwilioSmsProvider implements SmsProvider
{
    /** @param array<string, mixed> $credentials */
    public function __construct(protected array $credentials = []) {}

    public function name(): string
    {
        return 'twilio';
    }

    public function send(string $to, string $message): array
    {
        $sid = (string) ($this->credentials['account_sid'] ?? '');
        $token = (string) ($this->credentials['auth_token'] ?? '');
        $from = (string) ($this->credentials['from'] ?? '');

        try {
            $response = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->timeout(15)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                    'To' => $to,
                    'From' => $from,
                    'Body' => $message,
                ]);

            $data = $response->json() ?? [];

            return [
                'ok' => $response->successful(),
                'reference' => $data['sid'] ?? null,
                'error' => $response->successful() ? null : ($data['message'] ?? $response->body()),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'reference' => null, 'error' => $e->getMessage()];
        }
    }
}
