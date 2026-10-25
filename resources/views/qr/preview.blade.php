<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Card preview</title>
    <style>
        html, body { margin: 0; padding: 0; background: #eef2f7; }
        .preview { display: flex; justify-content: center; padding: 10px; }
        .qr-card { box-shadow: 0 1px 6px rgba(15, 23, 42, .18); }
        .qr-card img { display: block; }
    </style>
</head>
<body>
    <div class="preview">{!! $card !!}</div>
</body>
</html>
