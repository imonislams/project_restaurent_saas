<?php

namespace App\Http\Controllers\Staff;

use App\Domain\Identity\InvitationService;
use App\Domain\Identity\Models\Invitation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\AcceptInvitationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AcceptInvitationController extends Controller
{
    public function __construct(protected InvitationService $invitations) {}

    public function show(string $token): Response|RedirectResponse
    {
        $invitation = $this->resolve($token);

        if ($invitation === null) {
            return redirect()->route('login')
                ->withErrors(['email' => 'This invitation link is invalid or has expired.']);
        }

        return Inertia::render('Invitations/Accept', [
            'token' => $token,
            'invitation' => [
                'email' => $invitation->email,
                'name' => $invitation->name,
                'restaurant' => $invitation->tenant?->name,
            ],
            'valid' => $invitation->isPending(),
        ]);
    }

    public function store(AcceptInvitationRequest $request, string $token): RedirectResponse
    {
        $invitation = $this->resolve($token);

        if ($invitation === null) {
            return redirect()->route('login')
                ->withErrors(['email' => 'This invitation link is invalid or has expired.']);
        }

        $user = $this->invitations->accept($invitation, $request->validated());

        Auth::login($user);

        return redirect()->route('dashboard')
            ->with('success', 'Welcome aboard! Your account is ready.');
    }

    protected function resolve(string $token): ?Invitation
    {
        try {
            return $this->invitations->findByToken($token);
        } catch (RuntimeException) {
            return null;
        }
    }
}
