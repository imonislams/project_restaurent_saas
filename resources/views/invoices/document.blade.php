<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        * { font-family: DejaVu Sans, Arial, sans-serif; }
        body { color: #1f2937; font-size: 12px; margin: 0; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .muted { color: #6b7280; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-size: 11px; text-transform: uppercase; color: #6b7280; }
        .right { text-align: right; }
        .totals { margin-top: 16px; width: 280px; margin-left: auto; }
        .totals td { border: none; padding: 3px 0; }
        .grand { font-weight: bold; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #eef2ff; color: #4338ca; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>{{ $platform['name'] }}</h1>
            <div class="muted">{{ $platform['email'] }}</div>
        </div>
        <div class="right">
            <h1>Invoice</h1>
            <div class="muted">{{ $invoice->number }}</div>
            <div class="badge">{{ $invoice->status->label() }}</div>
        </div>
    </div>

    <table>
        <tr>
            <td>
                <strong>Billed to</strong><br>
                {{ $tenant['name'] }}<br>
                <span class="muted">{{ $tenant['email'] }}</span><br>
                <span class="muted">{{ $tenant['address'] }}</span>
            </td>
            <td class="right">
                <strong>Issued</strong> {{ optional($invoice->issued_at)->format('Y-m-d') }}<br>
                <strong>Due</strong> {{ optional($invoice->due_date)->format('Y-m-d') ?? '—' }}<br>
                <strong>Period</strong> {{ optional($invoice->period_start)->format('Y-m-d') }} – {{ optional($invoice->period_end)->format('Y-m-d') }}
            </td>
        </tr>
    </table>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="right">Qty</th>
                <th class="right">Unit price</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="right">{{ rtrim(rtrim(number_format((float) $item->quantity, 3), '0'), '.') }}</td>
                    <td class="right">{{ $invoice->currency }} {{ number_format((float) $item->unit_price, 2) }}</td>
                    <td class="right">{{ $invoice->currency }} {{ number_format((float) $item->amount, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="4" class="muted">No line items.</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="muted">Subtotal</td><td class="right">{{ $invoice->currency }} {{ number_format((float) $invoice->subtotal, 2) }}</td></tr>
        @if ((float) $invoice->discount_amount > 0)
            <tr><td class="muted">Discount {{ $invoice->coupon_code ? '('.$invoice->coupon_code.')' : '' }}</td><td class="right">-{{ $invoice->currency }} {{ number_format((float) $invoice->discount_amount, 2) }}</td></tr>
        @endif
        <tr class="grand"><td>Total</td><td class="right">{{ $invoice->currency }} {{ number_format((float) $invoice->amount, 2) }}</td></tr>
        @if ((float) $invoice->paid_at)
            <tr><td class="muted">Paid</td><td class="right">{{ optional($invoice->paid_at)->format('Y-m-d') }}</td></tr>
        @endif
    </table>

    @if ($credit_notes->isNotEmpty())
        <h3 style="margin-top:24px; font-size:13px;">Credit notes</h3>
        <table>
            <thead><tr><th>Number</th><th>Reason</th><th class="right">Amount</th></tr></thead>
            <tbody>
                @foreach ($credit_notes as $note)
                    <tr>
                        <td>{{ $note->number }}</td>
                        <td>{{ $note->reason }}</td>
                        <td class="right">{{ $note->currency }} {{ number_format((float) $note->amount, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
