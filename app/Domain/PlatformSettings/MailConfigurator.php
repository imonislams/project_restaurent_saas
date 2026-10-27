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

        // config/mail.php ships "hello@example.com" as its default sender, so an
        // unconfigured platform would send from a domain that can never deliver:
        // example.com (RFC 2606) publishes "v=spf1 -all" with DMARC p=reject, so
        // receivers reject or quarantine everything sent from it — the transport
        // reports success while nothing ever arrives. Fall back to the
        // authenticated SMTP mailbox, an address the provider owns and signs for.
        $from = self::deliverableFromAddress($value('from_address'), $value('username')) ?? $value('from_address');

        if (! empty($from)) {
            config(['mail.from.address' => $from]);
        }

        if (! empty($value('from_name'))) {
            config(['mail.from.name' => $value('from_name')]);
        }
    }

    /**
     * The sender the provider will accept mail from, or null when neither the
     * configured address nor the SMTP mailbox could be delivered.
     */
    public static function deliverableFromAddress(mixed $address, mixed $username): ?string
    {
        foreach ([$address, $username] as $candidate) {
            if (is_string($candidate) && self::isDeliverable($candidate)) {
                return trim($candidate);
            }
        }

        return null;
    }

    /**
     * Addresses reserved for documentation and testing cannot receive mail, so
     * sending from them fails silently at the receiving server.
     */
    protected static function isDeliverable(string $address): bool
    {
        $address = trim($address);

        if (filter_var($address, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        $domain = strtolower((string) substr((string) strrchr($address, '@'), 1));

        if (in_array($domain, ['localhost', 'example.com', 'example.net', 'example.org'], true)) {
            return false;
        }

        foreach (['.example.com', '.example.net', '.example.org', '.localhost', '.invalid'] as $reserved) {
            if (str_ends_with($domain, $reserved)) {
                return false;
            }
        }

        return true;
    }
}
