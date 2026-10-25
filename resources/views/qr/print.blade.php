<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Table QR codes</title>
    <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        @page { size: {{ (float) ($canvas['width_mm'] ?? 100) }}mm {{ (float) ($canvas['height_mm'] ?? 150) }}mm; margin: 0; }
        .sheet { page-break-after: always; }
        .sheet:last-child { page-break-after: auto; }
        .qr-card img { display: block; }
    </style>
</head>
<body>
    @foreach ($cards as $card)
        <div class="sheet">{!! $card !!}</div>
    @endforeach
</body>
</html>
