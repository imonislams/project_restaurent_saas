<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Invoice {{ $invoice->number }}</title></head>
<body style="font-family: Arial, sans-serif; color: #1f2937;">
    <h2 style="margin-bottom:4px;">Invoice {{ $invoice->number }}</h2>
    <p style="color:#6b7280; margin-top:0;">
        {{ $invoice->currency }} {{ number_format((float) $invoice->amount, 2) }}
        · issued {{ optional($invoice->issued_at)->format('Y-m-d') }}
        @if ($invoice->due_date) · due {{ $invoice->due_date->format('Y-m-d') }} @endif
    </p>
    <p>The invoice PDF is attached to this email.</p>
    <p style="color:#6b7280; font-size:12px;">If you have any questions about this invoice, reply to this email.</p>
</body>
</html>
