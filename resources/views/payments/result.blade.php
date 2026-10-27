<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Payment result</title></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; display:flex; min-height:100vh; align-items:center; justify-content:center;">
    <div style="background:#fff; border-radius:8px; padding:32px 40px; box-shadow:0 1px 3px rgba(0,0,0,.1); max-width:420px; text-align:center;">
        <h2 style="margin-top:0; color:#111827;">Payment result</h2>
        <p style="color:#374151;">{{ $message }}</p>
        @auth
            <p style="margin-top:20px;">
                <a href="{{ auth()->user()->is_platform_admin ? url('/platform') : url('/subscription') }}"
                   style="display:inline-block; background:#EC3013; color:#fff; text-decoration:none; font-weight:bold; padding:10px 18px; border-radius:6px;">
                    Continue
                </a>
            </p>
        @else
            <p style="margin-top:20px;">
                <a href="{{ url('/login') }}" style="color:#EC3013; font-weight:bold;">Sign in</a>
            </p>
        @endauth
    </div>
</body>
</html>
