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
        } elseif (! empty($value('host')) && ! empty($value('username'))) {
            // SMTP credentials with no explicit mailer: an administrator who filled
            // in a server, login and password means to send through it. Without this
            // the transport would stay on the env default — and a production .env
            // ships MAIL_MAILER=log, so every message would be written to the log
            // file instead of being delivered.
            config(['mail.default' => 'smtp']);
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
     * The delivery problem with the configuration currently in effect (after
     * apply()), or null when mail can be delivered. Reflects what the mailer
     * will actually do, not merely what is stored.
     */
    public function deliveryProblem(): ?string
    {
        return self::problemFor(
            (string) config('mail.default'),
            self::deliverableFromAddress(
                config('mail.from.address'),
                $this->settings->get('mail.username') ?? config('mail.mailers.smtp.username'),
            ),
            in_array('mail.password', $this->settings->unreadableKeys(), true),
        );
    }

    /**
     * Why outbound mail would not be delivered, built from values a caller has
     * already resolved. Null means the configuration can deliver.
     */
    public static function problemFor(string $transport, ?string $from, bool $passwordUnreadable = false): ?string
    {
        if (in_array($transport, ['log', 'array'], true)) {
            return 'Nothing is being delivered: the active transport is "'.$transport.'", so every message is written '
                .'to the application log instead of being sent. Fill in your SMTP host, port, username and password and '
                .'choose the "smtp" mailer — or set MAIL_MAILER=smtp and the MAIL_* values in .env.';
        }

        if ($passwordUnreadable) {
            return 'The saved SMTP password cannot be read: it was encrypted with a different APP_KEY (the key was '
                .'changed, or this database came from another install). Delivery fails authentication until the password '
                .'is re-entered and saved.';
        }

        if ($from === null) {
            return 'The From address cannot deliver mail: it is missing, not an email address, or on a reserved domain '
                .'(example.com). Use an address on your mail provider\'s domain — your SMTP username is a safe choice.';
        }

        return null;
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
