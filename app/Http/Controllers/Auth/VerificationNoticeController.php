<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renders the correct verification screen for the contact the account was
 * created with — an emailed link for email accounts, an SMS code for mobile.
 */
class VerificationNoticeController extends Controller
{
    public function __invoke(Request $request): RedirectResponse|Response
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        if ($user->registersByEmail()) {
            return Inertia::render('Auth/VerifyEmail', ['status' => session('status')]);
        }

        return Inertia::render('Auth/VerifyPhone', [
            'phone' => $this->maskPhone($user->phone),
            'status' => session('status'),
        ]);
    }

    protected function maskPhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        $visible = substr($phone, -4);

        return str_repeat('•', max(0, strlen($phone) - 4)).$visible;
    }
}
