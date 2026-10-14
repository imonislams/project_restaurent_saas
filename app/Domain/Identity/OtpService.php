<?php

namespace App\Domain\Identity;

use App\Domain\Communications\Sms\SmsManager;
use App\Domain\Identity\Models\PhoneVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Issues and verifies one-time codes sent by SMS. Codes are hashed, expire,
 * attempt-limited, single-use and rate-limited. A delivery failure is non-fatal.
 */
class OtpService
{
    public const PURPOSE = 'phone_verification';

    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(protected SmsManager $sms) {}

    /**
     * Issue a fresh code for the user's phone and send it by SMS.
     */
    public function issue(User $user, ?string $purpose = null): PhoneVerificationCode
    {
        $purpose ??= self::PURPOSE;

        if ($user->phone === null) {
            throw ValidationException::withMessages(['phone' => 'This account has no mobile number to verify.']);
        }

        $this->guardCooldown($user, $purpose);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $record = $user->phoneVerificationCodes()->create([
            'phone' => $user->phone,
            'code_hash' => Hash::make($code),
            'purpose' => $purpose,
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        $message = "Your verification code is {$code}. It expires in ".self::TTL_MINUTES.' minutes.';

        $this->sms->send($user->phone, $message);

        return $record;
    }

    /**
     * Verify a submitted code. Consumes the code on success; increments the
     * attempt counter on failure.
     */
    public function verify(User $user, string $code, ?string $purpose = null): bool
    {
        $purpose ??= self::PURPOSE;

        $record = $user->phoneVerificationCodes()
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $record || $record->isExpired() || $record->attempts >= self::MAX_ATTEMPTS) {
            return false;
        }

        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            return false;
        }

        $record->forceFill(['consumed_at' => now()])->save();

        return true;
    }

    /** Invalidate any outstanding codes for a purpose. */
    public function clear(User $user, ?string $purpose = null): void
    {
        $purpose ??= self::PURPOSE;

        $user->phoneVerificationCodes()
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);
    }

    protected function guardCooldown(User $user, string $purpose): void
    {
        $last = $user->phoneVerificationCodes()
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        if ($last && $last->created_at->gt(now()->subSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            $wait = self::RESEND_COOLDOWN_SECONDS - $last->created_at->diffInSeconds(now());

            throw ValidationException::withMessages([
                'code' => 'Please wait '.max(1, (int) $wait).' seconds before requesting a new code.',
            ]);
        }
    }
}
