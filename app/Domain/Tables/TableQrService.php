<?php

namespace App\Domain\Tables;

use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Issues and rotates the public QR identity for a table. Tokens are opaque and
 * high entropy; they identify the table only and can be revoked or regenerated
 * at any time without affecting orders or sessions.
 */
class TableQrService
{
    public function activeToken(Table $table): ?TableQrToken
    {
        return $table->qrTokens()
            ->where('is_active', true)
            ->whereNull('revoked_at')
            ->latest('id')
            ->first();
    }

    /** Return the table's usable token, issuing one if the table has none. */
    public function ensureToken(Table $table, ?User $user = null): TableQrToken
    {
        return $this->activeToken($table) ?? $this->issue($table, $user);
    }

    /** Invalidate the current token and issue a fresh one. */
    public function regenerate(Table $table, ?User $user = null): TableQrToken
    {
        $this->revoke($table);

        return $this->issue($table, $user);
    }

    public function revoke(Table $table): void
    {
        $table->qrTokens()
            ->where('is_active', true)
            ->update(['is_active' => false, 'revoked_at' => now()]);
    }

    public function url(TableQrToken $token): string
    {
        return url('/qr/'.$token->token);
    }

    protected function issue(Table $table, ?User $user): TableQrToken
    {
        return $table->qrTokens()->create([
            'tenant_id' => $table->tenant_id,
            'branch_id' => $table->branch_id,
            'token' => Str::random(64),
            'is_active' => true,
            'created_by' => $user?->getKey(),
        ]);
    }
}
