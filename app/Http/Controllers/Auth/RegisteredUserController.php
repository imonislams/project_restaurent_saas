<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Identity\OtpService;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Actions\RegisterTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(protected RegisterTenant $registerTenant) {}

    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        $plan = request()->string('plan')->toString();
        $selected = $plan === '' ? null : Plan::query()
            ->where('slug', $plan)->where('is_active', true)->where('visibility', 'public')
            ->first(['name', 'slug']);

        return Inertia::render('Auth/Register', [
            'selectedPlan' => $selected ? ['name' => $selected->name, 'slug' => $selected->slug] : null,
        ]);
    }

    /**
     * Handle an incoming registration request.
     */
    public function store(RegisterRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = $this->registerTenant->execute($data);

        Auth::login($user);

        if ($user->registersByEmail()) {
            // Sends the verification link (User implements MustVerifyEmail).
            event(new Registered($user));

            return redirect(route('verification.notice', absolute: false));
        }

        // Mobile sign-up: deliver a one-time code to the phone.
        app(OtpService::class)->issue($user);

        return redirect(route('verification.phone', absolute: false));
    }
}
