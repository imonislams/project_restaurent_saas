<?php

namespace App\Domain\Communications;

use App\Domain\Communications\Models\EmailTemplate;
use App\Domain\PlatformSettings\PlatformSettings;

/**
 * Renders the platform's editable email templates.
 *
 * Templates store the editable *content* (rich text). The branded, email-safe
 * shell is applied at render time, so content edits stay simple and the design
 * stays consistent. A body that is already a full HTML document (legacy rows)
 * is used verbatim instead of being wrapped.
 */
class EmailTemplateService
{
    public function find(string $key): ?EmailTemplate
    {
        return EmailTemplate::query()->where('key', $key)->first();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{subject: string, body: string}|null
     */
    public function render(string $key, array $data = []): ?array
    {
        $template = EmailTemplate::query()->where('key', $key)->where('is_active', true)->first();

        if (! $template) {
            return null;
        }

        return [
            'subject' => $this->compile($template->subject, $data),
            'body' => $this->wrap($this->compile($template->body, $data)),
        ];
    }

    /** @param array<string, mixed> $data */
    public function compile(string $text, array $data): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/', function ($matches) use ($data) {
            $value = data_get($data, $matches[1], '');

            return is_scalar($value) ? e((string) $value) : '';
        }, $text) ?? $text;
    }

    /** Wrap content in the branded shell unless it is already a full document. */
    public function wrap(string $html): string
    {
        if (stripos($html, '<!doctype') !== false || stripos($html, '<html') !== false) {
            return $html;
        }

        return $this->shell($html);
    }

    public function platformName(): string
    {
        return (string) (app(PlatformSettings::class)->get('general.platform_name') ?: config('app.name'));
    }

    public function brandColor(): string
    {
        $color = (string) (app(PlatformSettings::class)->get('branding.brand_color') ?: '#4f46e5');

        return preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) ? $color : '#4f46e5';
    }

    /**
     * The branded, responsive, email-client-safe shell (table layout + inline
     * styles, plus a baseline style block for content added in the editor).
     */
    public function shell(string $innerHtml): string
    {
        $color = $this->brandColor();
        $name = e($this->platformName());
        $tagline = e((string) (app(PlatformSettings::class)->get('branding.tagline') ?: ''));
        $year = date('Y');

        $header = '<span style="display:inline-block;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.3px;">'.$name.'</span>'
            .($tagline !== '' ? '<span style="display:block;margin-top:2px;color:rgba(255,255,255,.85);font-size:12px;">'.$tagline.'</span>' : '');

        return <<<HTML
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>{$name}</title>
<style>
  .email-body p { margin:0 0 16px; font-size:15px; line-height:24px; color:#374151; }
  .email-body h1 { margin:0 0 14px; font-size:21px; line-height:30px; font-weight:700; color:#111827; }
  .email-body h2 { margin:0 0 12px; font-size:18px; line-height:26px; font-weight:700; color:#111827; }
  .email-body h3 { margin:0 0 10px; font-size:16px; line-height:24px; font-weight:600; color:#111827; }
  .email-body ul, .email-body ol { margin:0 0 16px; padding-left:22px; font-size:15px; line-height:24px; color:#374151; }
  .email-body li { margin:0 0 6px; }
  .email-body a { color:{$color}; text-decoration:underline; }
  .email-body strong { font-weight:600; }
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Roboto,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{$name} notification</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;width:100%;">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.10);">
        <tr>
          <td style="background:{$color};padding:22px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="left" style="color:#ffffff;">{$header}</td></tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div class="email-body" style="font-family:Roboto,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">{$innerHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #eef0f2;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;text-align:center;">&copy; {$year} {$name}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
    }

    public function heading(string $text): string
    {
        return '<h1 style="margin:0 0 14px;font-size:21px;line-height:30px;font-weight:700;color:#111827;">'.$text.'</h1>';
    }

    public function paragraph(string $html): string
    {
        return '<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">'.$html.'</p>';
    }

    /**
     * A rounded details panel of label/value rows.
     *
     * @param  array<string, string>  $rows
     */
    public function panel(array $rows, string $accent = '#eef0f2'): string
    {
        $html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background:#f9fafb;border:1px solid '.$accent.';border-radius:10px;">';

        $total = count($rows);
        $index = 0;
        foreach ($rows as $label => $value) {
            $index++;
            $border = $index < $total ? 'border-bottom:1px solid '.$accent.';' : '';
            $html .= '<tr>'
                .'<td style="padding:13px 18px;font-size:13px;color:#6b7280;'.$border.'">'.e($label).'</td>'
                .'<td align="right" style="padding:13px 18px;font-size:14px;font-weight:600;color:#111827;'.$border.'">'.$value.'</td>'
                .'</tr>';
        }

        return $html.'</table>';
    }

    public function button(string $label, string $url): string
    {
        $color = $this->brandColor();

        return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px;">'
            .'<tr><td align="center" style="border-radius:8px;background:'.$color.';">'
            .'<a href="'.e($url).'" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">'.e($label).'</a>'
            .'</td></tr></table>';
    }

    /**
     * Default editable content for each template (the shell is applied at render).
     *
     * @return array<string, array{name: string, subject: string, body: string, variables: list<string>}>
     */
    public function defaults(): array
    {
        return [
            'invoice_issued' => [
                'name' => 'Invoice issued',
                'subject' => 'Invoice {{ invoice_number }} from {{ platform_name }}',
                'body' => $this->heading('Invoice {{ invoice_number }}')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('A new invoice has been generated for your {{ platform_name }} account. Please find the details below.')
                    .$this->panel([
                        'Invoice number' => '{{ invoice_number }}',
                        'Amount due' => '<span style="font-size:16px;color:#111827;">{{ amount }}</span>',
                        'Due date' => '{{ due_date }}',
                    ])
                    .$this->paragraph('A PDF copy is attached to this email. If you have already paid, please disregard this notice.'),
                'variables' => ['invoice_number', 'tenant_name', 'amount', 'due_date', 'platform_name'],
            ],
            'payment_failed' => [
                'name' => 'Payment failed',
                'subject' => 'Payment failed for invoice {{ invoice_number }}',
                'body' => $this->heading('Payment unsuccessful')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('We were unable to process your payment. To keep your service running, please update your payment details.')
                    .$this->panel([
                        'Invoice' => '{{ invoice_number }}',
                        'Amount' => '{{ amount }}',
                    ], '#fde68a')
                    .$this->paragraph('No action is needed if a retry succeeds in the meantime.'),
                'variables' => ['tenant_name', 'invoice_number', 'amount', 'platform_name'],
            ],
            'subscription_expiring' => [
                'name' => 'Subscription expiring',
                'subject' => 'Your {{ plan_name }} subscription ends soon',
                'body' => $this->heading('Your subscription ends soon')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('Your current subscription is coming to an end. Renew to avoid any interruption.')
                    .$this->panel([
                        'Plan' => '{{ plan_name }}',
                        'Ends on' => '{{ end_date }}',
                    ])
                    .$this->paragraph('You can renew at any time from your billing settings.'),
                'variables' => ['tenant_name', 'plan_name', 'end_date', 'platform_name'],
            ],
            'renewal_reminder' => [
                'name' => 'Renewal reminder',
                'subject' => 'Your subscription renews on {{ end_date }}',
                'body' => $this->heading('Upcoming renewal')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('This is a friendly reminder that your subscription is scheduled to renew.')
                    .$this->panel([
                        'Plan' => '{{ plan_name }}',
                        'Renews on' => '{{ end_date }}',
                        'Amount' => '{{ amount }}',
                    ]),
                'variables' => ['tenant_name', 'plan_name', 'end_date', 'amount', 'platform_name'],
            ],
            'payment_succeeded' => [
                'name' => 'Payment received',
                'subject' => 'Payment received for invoice {{ invoice_number }}',
                'body' => $this->heading('Payment received')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('We have received and verified your payment. Your subscription is active.')
                    .$this->panel([
                        'Invoice' => '{{ invoice_number }}',
                        'Amount' => '{{ amount }}',
                        'Gateway' => '{{ gateway }}',
                    ])
                    .$this->button('View billing', '{{ billing_url }}'),
                'variables' => ['tenant_name', 'invoice_number', 'amount', 'gateway', 'billing_url', 'platform_name'],
            ],
            'subscription_activated' => [
                'name' => 'Subscription activated',
                'subject' => 'Your {{ plan_name }} subscription is active',
                'body' => $this->heading('Subscription active')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('Your <strong>{{ plan_name }}</strong> subscription is now active.')
                    .$this->panel([
                        'Plan' => '{{ plan_name }}',
                        'Renews on' => '{{ end_date }}',
                    ]),
                'variables' => ['tenant_name', 'plan_name', 'end_date', 'platform_name'],
            ],
            'subscription_cancelled' => [
                'name' => 'Subscription cancelled',
                'subject' => 'Your subscription has been cancelled',
                'body' => $this->heading('Subscription cancelled')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('Your <strong>{{ plan_name }}</strong> subscription has been cancelled. Access continues until {{ end_date }}.')
                    .$this->paragraph('You can reactivate at any time from your billing settings.'),
                'variables' => ['tenant_name', 'plan_name', 'end_date', 'platform_name'],
            ],
            'refund_processed' => [
                'name' => 'Refund processed',
                'subject' => 'A refund of {{ amount }} has been processed',
                'body' => $this->heading('Refund processed')
                    .$this->paragraph('Hello {{ tenant_name }},')
                    .$this->paragraph('A refund of <strong>{{ amount }}</strong> has been recorded on your account.'),
                'variables' => ['tenant_name', 'amount', 'platform_name'],
            ],
            'staff_invitation' => [
                'name' => 'Staff invitation',
                'subject' => 'You have been invited to {{ tenant_name }}',
                'body' => $this->heading('You have been invited')
                    .$this->paragraph('Hello,')
                    .$this->paragraph('<strong>{{ inviter_name }}</strong> has invited you to join <strong>{{ tenant_name }}</strong> on {{ platform_name }}.')
                    .$this->button('Accept invitation', '{{ invite_url }}')
                    .$this->paragraph('If you were not expecting this invitation, you can safely ignore this email.'),
                'variables' => ['tenant_name', 'inviter_name', 'invite_url', 'platform_name'],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function sampleData(): array
    {
        return [
            'tenant_name' => 'Demo Restaurant',
            'platform_name' => $this->platformName(),
            'invoice_number' => 'INV-20260101-0001',
            'amount' => '29.00 USD',
            'due_date' => now()->addDays(7)->toFormattedDateString(),
            'end_date' => now()->addDays(7)->toFormattedDateString(),
            'plan_name' => 'Starter',
            'inviter_name' => 'Jane Doe',
            'invite_url' => url('/invitations/example-token'),
        ];
    }
}
