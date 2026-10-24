<?php

namespace App\Domain\PlatformSettings;

/**
 * Applies stored mail settings over the file/env configuration at boot, so the
 * platform can be reconfigured from the UI without a deploy.
 */
class MailConfigurator
{
    public function __construct(protected PlatformSettings $settings) {}

    public function apply(): void
    {
        $mail = $this->settings->group('mail');

        if ($mail === []) {
            return;
        }

        // group() keys carry the group prefix, e.g. "mail.host".
        $value = fn (string $key) => $mail['mail.'.$key] ?? null;

        if (! empty($value('mailer'))) {
            config(['mail.default' => $value('mailer')]);
        }

        $port = $value('port');

        // The UI's encryption choice maps to a transport scheme; Symfony only
        // accepts "smtp" (STARTTLS) or "smtps" (implicit TLS).
        $scheme = match (strtolower((string) $value('encryption'))) {
            'ssl' => 'smtps',
            'tls' => 'smtp',
            default => null,
        };

        $smtp = array_filter([
            'host' => $value('host'),
            'port' => $port !== null && $port !== '' ? (int) $port : null,
            'username' => $value('username'),
            'password' => $value('password'),
            'scheme' => $scheme,
        ], fn ($value) => $value !== null && $value !== '');

        if ($smtp !== []) {
            config(['mail.mailers.smtp' => array_merge(config('mail.mailers.smtp'), $smtp)]);
        }

        if (! empty($value('from_address'))) {
            config(['mail.from.address' => $value('from_address')]);
        }

        if (! empty($value('from_name'))) {
            config(['mail.from.name' => $value('from_name')]);
        }
    }
}
