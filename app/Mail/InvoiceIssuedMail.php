<?php

namespace App\Mail;

use App\Domain\Billing\InvoiceService;
use App\Domain\Communications\EmailTemplateService;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Mail\Concerns\RetryableMail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invoice delivery. Queued with the invoice PDF attached so a mail failure never
 * blocks the billing operation that issued the invoice.
 */
class InvoiceIssuedMail extends Mailable implements ShouldQueue, RetryableMail
{
    use Queueable, SerializesModels;

    public function __construct(public SubscriptionInvoice $invoice) {}

    /** @return array<string, mixed> */
    public function emailRetryPayload(): array
    {
        return ['invoice_id' => $this->invoice->getKey()];
    }

    public function emailRetryTenantId(): ?int
    {
        return $this->invoice->tenant_id;
    }

    public static function fromRetryPayload(array $payload): self
    {
        return new self(SubscriptionInvoice::withoutGlobalScopes()->findOrFail($payload['invoice_id']));
    }

    public function envelope(): Envelope
    {
        $rendered = app(EmailTemplateService::class)->render('invoice_issued', $this->templateData());

        return new Envelope(subject: $rendered['subject'] ?? ('Invoice '.$this->invoice->number));
    }

    public function content(): Content
    {
        $rendered = app(EmailTemplateService::class)->render('invoice_issued', $this->templateData());

        if ($rendered) {
            return new Content(html: $rendered['body']);
        }

        return new Content(view: 'emails.invoice-issued', with: [
            'invoice' => $this->invoice,
        ]);
    }

    /** @return array<string, mixed> */
    protected function templateData(): array
    {
        return [
            'invoice_number' => $this->invoice->number,
            'tenant_name' => $this->invoice->tenant?->name,
            'amount' => number_format((float) $this->invoice->amount, 2).' '.$this->invoice->currency,
            'due_date' => $this->invoice->due_date?->toFormattedDateString(),
            'platform_name' => app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('general.platform_name', config('app.name')),
        ];
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        $pdf = Pdf::loadView('invoices.document', app(InvoiceService::class)->documentData($this->invoice))->output();

        return [
            Attachment::fromData(fn () => $pdf, 'invoice-'.$this->invoice->number.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
