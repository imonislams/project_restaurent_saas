<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Secure checkout</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: #f3f2f2; color: #201e1d;
            font-family: Roboto, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
        }
        .card {
            width: 100%; max-width: 420px; padding: 28px; text-align: center;
            background: #fff; border: 1px solid #e7e5e4; border-radius: 14px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, .08);
        }
        .spinner {
            width: 28px; height: 28px; margin: 0 auto 16px; border-radius: 50%;
            border: 3px solid #e7e5e4; border-top-color: #ec3013;
            animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
        p { margin: 0; font-size: 13px; line-height: 1.5; color: #78716c; }
        a { color: #ec3013; }
        @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner" aria-hidden="true"></div>
        <h1>Opening secure checkout</h1>
        <p id="status">Please wait while we connect you to the payment provider.</p>
        <p style="margin-top:14px;">
            <a id="back-link" href="{{ $returnUrl.'?_ptxn='.urlencode($transactionId) }}">Return to billing</a>
        </p>
        <noscript><p>JavaScript is required to complete this payment.</p></noscript>
    </div>

    <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
    <script>
        (function () {
            var transactionId = @json($transactionId);
            var clientToken = @json($clientToken);
            var environment = @json($environment);
            var returnUrl = @json($returnUrl);
            var status = document.getElementById('status');

            if (typeof Paddle === 'undefined') {
                status.textContent = 'Unable to load the payment provider. Please contact support.';
                return;
            }

            try {
                if (environment !== 'production') {
                    Paddle.Environment.set('sandbox');
                }

                // Always leave this page once the checkout ends — success, an
                // error, or the customer closing it — so they land on a status
                // page instead of a blank screen.
                var finished = false;
                var finish = function () {
                    if (finished) return;
                    finished = true;
                    window.location.href = returnUrl + '?_ptxn=' + encodeURIComponent(transactionId);
                };

                Paddle.Initialize({
                    token: clientToken,
                    eventCallback: function (event) {
                        var name = event && event.name;
                        if (name === 'checkout.completed' || name === 'checkout.closed' || name === 'checkout.error') {
                            finish();
                        }
                    },
                });

                Paddle.Checkout.open({
                    transactionId: transactionId,
                    settings: { displayMode: 'overlay' },
                });
            } catch (e) {
                status.textContent = 'The checkout could not be opened. Please try again.';
            }
        })();
    </script>
</body>
</html>
