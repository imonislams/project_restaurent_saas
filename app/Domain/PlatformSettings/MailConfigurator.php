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

        if (! empty($mail['mailer'])) {
            config(['mail.default' => $mail['mailer']]);
        }

        $smtp = array_filter([
            'host' => $mail['host'] ?? null,
            'port' => isset($mail['port']) && $mail['port'] !== '' ? (int) $mail['port'] : null,
            'username' => $mail['username'] ?? null,
            'password' => $mail['password'] ?? null,
            'scheme' => $mail['encryption'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        if ($smtp !== []) {
            config(['mail.mailers.smtp' => array_merge(config('mail.mailers.smtp'), $smtp)]);
        }

        if (! empty($mail['from_address'])) {
            config(['mail.from.address' => $mail['from_address']]);
        }

        if (! empty($mail['from_name'])) {
            config(['mail.from.name' => $mail['from_name']]);
        }
    }
}
