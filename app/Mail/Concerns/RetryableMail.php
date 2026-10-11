<?php

namespace App\Mail\Concerns;

/**
 * A mailable that can be reconstructed for a retry from stored metadata.
 */
interface RetryableMail
{
    /** @return array<string, mixed> */
    public function emailRetryPayload(): array;

    public static function fromRetryPayload(array $payload): self;
}
