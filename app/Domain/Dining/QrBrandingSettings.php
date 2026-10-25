<?php

namespace App\Domain\Dining;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Branding for the customer-facing QR pages (what a diner sees after scanning).
 *
 * Resolution is branch-first: a branch's own `qr.branding` overrides the
 * tenant-wide value, which overrides the built-in defaults — so a restaurant
 * that never customises anything keeps the current look.
 *
 * Text that sits on a brand colour is paired with a contrast-safe colour
 * (`*_text`) computed here, so a pale primary colour can never produce
 * unreadable white-on-light labels.
 */
class QrBrandingSettings
{
    public const KEY = 'qr.branding';

    /** @return array<string, mixed> */
    public function defaults(): array
    {
        return [
            'primary_color' => '#ec3013',
            'accent_color' => '#0f172a',
            'background_color' => '#f8fafc',
            'header_style' => 'light',
            'show_logo' => true,
            'show_table_name' => true,
            'welcome_title' => '',
            'welcome_text' => '',
            'footer_text' => '',
        ];
    }

    /** @return list<array{value: string, label: string}> */
    public function headerStyles(): array
    {
        return [
            ['value' => 'light', 'label' => 'Light header'],
            ['value' => 'brand', 'label' => 'Brand colour header'],
            ['value' => 'dark', 'label' => 'Dark header'],
        ];
    }

    /** The branding for a tenant/branch pair, with derived contrast colours. */
    public function resolve(Tenant $tenant, ?Branch $branch = null): array
    {
        $resolved = array_merge(
            $this->defaults(),
            $this->clean((array) $tenant->getSetting(self::KEY, [])),
            $branch ? $this->clean((array) $branch->getSetting(self::KEY, [])) : [],
        );

        return $resolved + [
            'primary_text' => $this->contrastText($resolved['primary_color']),
            'accent_text' => $this->contrastText($resolved['accent_color']),
        ];
    }

    /**
     * Persist branding for a branch, or tenant-wide when no branch is given.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function save(Tenant $tenant, ?Branch $branch, array $input): array
    {
        $branding = $this->clean($input);
        $target = $branch ?? $tenant;

        $settings = $target->settings ?? [];
        data_set($settings, self::KEY, array_merge((array) data_get($settings, self::KEY, []), $branding));

        $target->forceFill(['settings' => $settings])->save();

        return $this->resolve($tenant, $branch);
    }

    /**
     * Keep only known keys, validated. Unknown keys are dropped so a crafted
     * payload can never reach the public page.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function clean(array $input): array
    {
        $defaults = $this->defaults();
        $clean = [];

        foreach (['primary_color', 'accent_color', 'background_color'] as $key) {
            if (array_key_exists($key, $input)) {
                $clean[$key] = $this->color($input[$key], $defaults[$key]);
            }
        }

        if (array_key_exists('header_style', $input)) {
            $clean['header_style'] = in_array($input['header_style'], ['light', 'brand', 'dark'], true)
                ? $input['header_style']
                : 'light';
        }

        foreach (['show_logo', 'show_table_name'] as $key) {
            if (array_key_exists($key, $input)) {
                $clean[$key] = (bool) $input[$key];
            }
        }

        foreach (['welcome_title', 'welcome_text', 'footer_text'] as $key) {
            if (array_key_exists($key, $input)) {
                $clean[$key] = $this->text($input[$key]);
            }
        }

        return $clean;
    }

    /** Readable text colour (near-black or white) for a background colour. */
    public function contrastText(string $hex): string
    {
        [$r, $g, $b] = $this->rgb($hex);

        // Relative luminance (sRGB), enough to pick black or white legibly.
        $luminance = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;

        return $luminance > 0.6 ? '#0f172a' : '#ffffff';
    }

    /** @return array{0: int, 1: int, 2: int} */
    protected function rgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        if (strlen($hex) !== 6 || preg_match('/^[0-9a-fA-F]{6}$/', $hex) !== 1) {
            return [255, 255, 255];
        }

        return [
            (int) hexdec(substr($hex, 0, 2)),
            (int) hexdec(substr($hex, 2, 2)),
            (int) hexdec(substr($hex, 4, 2)),
        ];
    }

    protected function color(mixed $value, string $fallback): string
    {
        if (is_string($value) && preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value) === 1) {
            return strlen($value) === 4
                ? '#'.$value[1].$value[1].$value[2].$value[2].$value[3].$value[3]
                : strtolower($value);
        }

        return $fallback;
    }

    protected function text(mixed $value): string
    {
        if (! is_string($value)) {
            return '';
        }

        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';

        return trim(mb_substr($clean, 0, 200));
    }
}
