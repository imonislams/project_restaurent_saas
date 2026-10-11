<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Maintenance</title></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; display:flex; min-height:100vh; align-items:center; justify-content:center;">
    <div style="background:#fff; border-radius:8px; padding:32px 40px; box-shadow:0 1px 3px rgba(0,0,0,.1); max-width:480px; text-align:center;">
        <h2 style="margin-top:0; color:#111827;">Scheduled maintenance</h2>
        <p style="color:#374151;">{{ $message }}</p>
        @if (! empty($endsAt))
            <p style="color:#6b7280; font-size:13px;">Expected back by {{ \Illuminate\Support\Carbon::parse($endsAt)->toDayDateTimeString() }}.</p>
        @endif
    </div>
</body>
</html>
