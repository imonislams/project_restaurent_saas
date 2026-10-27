<?php

use App\Http\Controllers\Payments\PlatformCallbackController;
use App\Http\Controllers\Payments\TenantPaymentReturnController;
use Illuminate\Support\Facades\Route;

/*
| Provider browser-return endpoints — deliberately OUTSIDE the "web" group.
|
| Payment providers POST the customer back from their own origin. With a
| SameSite=Lax session cookie the browser withholds it on a cross-site POST, so
| starting a session here would mint a new id and overwrite the visitor's
| signed-in session (they would land on the result page logged out). These
| routes therefore run without session, cookie or CSRF middleware; they verify
| the payment server-side and redirect.
*/

Route::match(['get', 'post'], '/payments/callback/{provider}/{result}', [PlatformCallbackController::class, 'callback'])
    ->name('payments.callback');

Route::match(['get', 'post'], '/payments/order-return/{provider}/{result}', TenantPaymentReturnController::class)
    ->name('payments.tenant-return');
