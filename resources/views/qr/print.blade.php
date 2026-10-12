<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Table QR Codes</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #0f172a; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        p.sub { margin: 0 0 18px; font-size: 12px; color: #64748b; }
        .grid { width: 100%; }
        .card {
            display: inline-block;
            width: 46%;
            margin: 2%;
            padding: 16px 12px 18px;
            text-align: center;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            page-break-inside: avoid;
        }
        .brand { font-size: 12px; font-weight: bold; color: #1F7557; letter-spacing: .02em; }
        .branch { font-size: 9px; color: #94a3b8; margin-bottom: 6px; }
        .table { font-size: 20px; font-weight: bold; margin: 8px 0 4px; }
        .area { font-size: 10px; color: #64748b; margin-bottom: 8px; }
        .qr { width: 150px; height: 150px; }
        .cta { font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 8px; }
        .hint { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    </style>
</head>
<body>
    <h1>{{ $tenantName }}</h1>
    <p class="sub">
        Scan. Order. Enjoy. — Table QR codes
        @if ($branchName) · {{ $branchName }} @endif
    </p>

    <div class="grid">
        @foreach ($cards as $card)
            <div class="card">
                <div class="brand">{{ $tenantName }}</div>
                @if ($card['area']) <div class="branch">{{ $card['area'] }}</div> @endif
                <div class="table">{{ $card['name'] }}</div>
                <img class="qr" src="{{ $card['png'] }}" alt="QR for {{ $card['name'] }}">
                <div class="cta">Scan to view the menu &amp; order</div>
                <div class="hint">No app needed</div>
            </div>
        @endforeach
    </div>
</body>
</html>
