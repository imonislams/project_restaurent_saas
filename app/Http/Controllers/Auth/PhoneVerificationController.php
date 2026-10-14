<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Identity\OtpService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Verifies a mobile account by one-time code. The code is delivered by the
 * platform-configured SMS provider; success marks the phone verified.
 */
class PhoneVerificationController extends Controller
{
    public function __construct(protected OtpService $otp) {}

    public function show(Request $request): RedirectResponse|Response
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        return Inertia::render('Auth/VerifyPhone', [
            'phone' => $this->maskPhone($user->phone),
            'status' => session('status'),
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'digits:6']]);

        $user = $request->user();

        if (! $this->otp->verify($user, $request->string('code')->toString())) {
            return back()->with('error', 'That code is incorrect or has expired. Please try again.');
        }

        $user->markPhoneAsVerified();

        return redirect()->intended(route('onboarding.index', absolute: false))
            ->with('success', 'Mobile number verified. Let\'s finish setting up your restaurant.');
    }

    public function resend(Request $request): RedirectResponse
    {
        $user = $request->user();

        $key = 'verify-phone-resend:'.$user->getKey();

        if (RateLimiter::tooManyAttempts($key, 3)) {
            return back()->with('error', 'Too many requests. Please wait a moment and try again.');
        }

        RateLimiter::hit($key, 300);

        $this->otp->issue($user);

        return back()->with('status', 'verification-code-sent');
    }

    protected function maskPhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        return str_repeat('•', max(0, strlen($phone) - 4)).substr($phone, -4);
    }
}
