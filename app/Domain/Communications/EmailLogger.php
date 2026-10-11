<?php

namespace App\Domain\Communications;

use App\Domain\Communications\Models\EmailLog;
use App\Mail\Concerns\RetryableMail;
use Symfony\Component\Mime\Email;

/**
 * Records outbound emails. Called from the MessageSent / MessageSendingFailed
 * listeners; never throws so a logging failure cannot break delivery.
 */
class EmailLogger
{
    public function sent(mixed $message, mixed $data = null): ?EmailLog
    {
        return $this->record('sent', $message, $data);
    }

    public function failed(mixed $message, \Throwable $exception, mixed $data = null): ?EmailLog
    {
        return $this->record('failed', $message, $data, $exception->getMessage());
    }

    protected function record(string $status, mixed $message, mixed $data, ?string $error = null): ?EmailLog
    {
        try {
            $email = $this->unwrap($message);

            if (! $email instanceof Email) {
                return null;
            }

            $retry = $data instanceof RetryableMail ? $data : null;

            return EmailLog::create([
                'tenant_id' => $this->tenantId($data),
                'to_email' => $this->address($email->getTo()),
                'from_email' => $this->address($email->getFrom()),
                'subject' => $email->getSubject(),
                'mailer' => config('mail.default'),
                'status' => $status,
                'attempts' => 1,
                'error' => $error,
                'retry_class' => $retry ? $retry::class : null,
                'retry_payload' => $retry ? $retry->emailRetryPayload() : null,
                'sent_at' => $status === 'sent' ? now() : null,
                'failed_at' => $status === 'failed' ? now() : null,
            ]);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function unwrap(mixed $message): mixed
    {
        if (is_object($message) && method_exists($message, 'getOriginalMessage')) {
            return $message->getOriginalMessage();
        }

        return $message;
    }

    /** @param list<\Symfony\Component\Mime\Address> $addresses */
    protected function address(array $addresses): string
    {
        return $addresses[0]->getAddress() ?? 'unknown@unknown';
    }

    protected function tenantId(mixed $data): ?int
    {
        if ($data instanceof RetryableMail && method_exists($data, 'emailRetryTenantId')) {
            return $data->emailRetryTenantId();
        }

        return null;
    }
}
