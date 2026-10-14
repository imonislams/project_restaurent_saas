<?php

namespace App\Domain\Communications\Sms\Contracts;

/**
 * SMS provider abstraction. Concrete drivers deliver a one-off message and
 * report success or a reason for failure. Providers must never throw — the
 * caller treats a failure as non-fatal so a delivery problem cannot break the
 * primary request.
 */
interface SmsProvider
{
    public function name(): string;

    /**
     * @return array{ok: bool, reference: ?string, error: ?string}
     */
    public function send(string $to, string $message): array;
}
