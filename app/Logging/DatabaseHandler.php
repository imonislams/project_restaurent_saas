<?php

namespace App\Logging;

use App\Domain\Monitoring\Models\ApplicationLog;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;

/**
 * Monolog handler that persists warnings and above to the database for the
 * in-app log viewer. Wrapped defensively so a logging failure never breaks a
 * request. Sensitive keys are redacted before storage.
 */
class DatabaseHandler extends AbstractProcessingHandler
{
    protected function write(LogRecord $record): void
    {
        try {
            ApplicationLog::create([
                'level' => strtolower($record->level->getName()),
                'message' => mb_substr($record->message, 0, 4000),
                'context' => $this->redact($record->context),
                'channel' => $record->channel,
                'request_id' => $record->context['request_id'] ?? null,
                'tenant_id' => $record->context['tenant_id'] ?? null,
                'user_id' => $record->context['user_id'] ?? null,
                'logged_at' => now(),
            ]);
        } catch (\Throwable) {
            // Never let logging break the application.
        }
    }

    /** @param array<string, mixed> $context */
    protected function redact(array $context): array
    {
        $sensitive = ['password', 'password_confirmation', 'secret', 'token', 'store_passwd', 'store_password', 'authorization', 'api_key'];

        foreach ($context as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitive, true)) {
                $context[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $context[$key] = $this->redact($value);
            }
        }

        return $context;
    }
}
