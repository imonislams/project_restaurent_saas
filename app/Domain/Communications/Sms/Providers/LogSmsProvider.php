<?php

namespace App\Domain\Communications\Sms\Providers;

use App\Domain\Communications\Sms\Contracts\SmsProvider;
use Illuminate\Support\Facades\Log;

/**
 * Development default: writes the message to the log instead of sending it.
 */
class LogSmsProvider implements SmsProvider
{
    public function name(): string
    {
        return 'log';
    }

    public function send(string $to, string $message): array
    {
        Log::info('sms.outbound', ['to' => $to, 'message' => $message]);

        return ['ok' => true, 'reference' => 'log', 'error' => null];
    }
}
