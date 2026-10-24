<?php

namespace App\Domain\PaymentGateways\Contracts;

use App\Domain\Billing\Models\PaymentGateway;

/**
 * A platform payment gateway driver. Implementations talk to the provider; they
 * must never trust a browser redirect as proof of payment — success is only
 * declared after server-side verification.
 *
 * A driver also describes how to read its own notification payloads so the
 * billing service can stay provider-agnostic.
 */
interface PlatformGateway
{
    public function name(): string;

    /**
     * Initiate a checkout session with the provider.
     *
     * @param  array<string, mixed>  $payload
     * @return array{status: string, reference: ?string, redirect_url: ?string, raw: array<string, mixed>}
     */
    public function createCheckout(PaymentGateway $config, array $payload): array;

    /**
     * Verify a transaction server-side using the provider's validation API.
     *
     * @return array{valid: bool, status: ?string, amount: ?float, currency: ?string, reference: ?string, raw: array<string, mixed>}
     */
    public function verifyTransaction(PaymentGateway $config, string $valId): array;

    /**
     * Whether an incoming webhook is authentic. For providers without a
     * signature this returns true and authenticity rests on verifyTransaction().
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers
     */
    public function verifyWebhook(PaymentGateway $config, array $payload, ?string $rawBody = null, array $headers = []): bool;

    /**
     * Request a refund. Providers without an API return a pending result for
     * manual processing.
     *
     * @return array{status: string, reference: ?string, raw: array<string, mixed>}
     */
    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array;

    /**
     * Our merchant reference carried in the notification, used to find the
     * matching local payment.
     *
     * @param  array<string, mixed>  $payload
     */
    public function notificationReference(array $payload): ?string;

    /**
     * A stable provider event id, used to deduplicate retried notifications.
     *
     * @param  array<string, mixed>  $payload
     */
    public function notificationEventId(array $payload): ?string;

    /**
     * The provider's event/status type, used to route subscription events.
     *
     * @param  array<string, mixed>  $payload
     */
    public function notificationEventType(array $payload): ?string;

    /**
     * The identifier passed to verifyTransaction() for this notification.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verificationId(array $payload): ?string;

    /**
     * Whether the notification describes a subscription lifecycle change rather
     * than a payment.
     *
     * @param  array<string, mixed>  $payload
     */
    public function isSubscriptionEvent(array $payload): bool;

    /**
     * A lightweight connectivity/credential check against the provider, used to
     * validate a configuration before it is shown as production-ready.
     *
     * @return array{ok: bool, error: ?string}
     */
    public function testConnection(PaymentGateway $config): array;
}
