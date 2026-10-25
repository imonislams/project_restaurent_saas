<?php

namespace App\Domain\Tables;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Models\QrCardDesign;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Owns the editable QR card designs: the built-in default, the branch →
 * company-wide → default resolution used when printing, and the canvas
 * normalisation that keeps a stored document safe to render in a PDF.
 *
 * The canvas vocabulary is deliberately small (text, rect, ellipse, line,
 * image, qr) and positioned in millimetres, because the same document drives
 * both the on-screen preview and the DomPDF export.
 */
class QrCardDesignService
{
    public const MAX_ELEMENTS = 60;

    /** Element types the renderer understands. */
    public const ELEMENT_TYPES = ['text', 'rect', 'ellipse', 'line', 'image', 'qr'];

    public const FONTS = ['sans', 'serif', 'mono'];

    public function __construct(protected AuditLogger $audit) {}

    /**
     * The built-in starter design, also used when a tenant has none yet.
     *
     * @return array<string, mixed>
     */
    public function defaultCanvas(): array
    {
        return [
            'width_mm' => 100,
            'height_mm' => 150,
            'background' => '#ffffff',
            'elements' => [
                [
                    'id' => 'background',
                    'type' => 'rect',
                    'x' => 0, 'y' => 0, 'w' => 100, 'h' => 150,
                    'props' => ['fill' => '#ffffff', 'border_color' => '#e2e8f0', 'border_width' => 0.4, 'radius' => 4],
                ],
                [
                    'id' => 'accent',
                    'type' => 'rect',
                    'x' => 0, 'y' => 0, 'w' => 100, 'h' => 3,
                    'props' => ['fill' => '#EC3013', 'border_color' => '#EC3013', 'border_width' => 0, 'radius' => 0],
                ],
                [
                    'id' => 'restaurant',
                    'type' => 'text',
                    'x' => 8, 'y' => 14, 'w' => 84, 'h' => 10,
                    'props' => $this->textProps('{{restaurant}}', ['size_pt' => 13, 'weight' => 'bold']),
                ],
                [
                    'id' => 'table',
                    'type' => 'text',
                    'x' => 8, 'y' => 27, 'w' => 84, 'h' => 14,
                    'props' => $this->textProps('{{table}}', ['size_pt' => 26, 'weight' => 'bold']),
                ],
                [
                    'id' => 'area',
                    'type' => 'text',
                    'x' => 8, 'y' => 43, 'w' => 84, 'h' => 8,
                    'props' => $this->textProps('{{area}}', ['size_pt' => 10, 'color' => '#64748b']),
                ],
                [
                    'id' => 'qr',
                    'type' => 'qr',
                    'x' => 25, 'y' => 56, 'w' => 50, 'h' => 50,
                    'props' => ['margin' => 1],
                ],
                [
                    'id' => 'cta',
                    'type' => 'text',
                    'x' => 8, 'y' => 114, 'w' => 84, 'h' => 8,
                    'props' => $this->textProps('Scan to view the menu', ['size_pt' => 11, 'weight' => 'bold']),
                ],
                [
                    'id' => 'hint',
                    'type' => 'text',
                    'x' => 8, 'y' => 124, 'w' => 84, 'h' => 6,
                    'props' => $this->textProps('No app needed', ['size_pt' => 9, 'color' => '#94a3b8']),
                ],
                [
                    'id' => 'branch',
                    'type' => 'text',
                    'x' => 8, 'y' => 138, 'w' => 84, 'h' => 6,
                    'props' => $this->textProps('{{branch}}', ['size_pt' => 8, 'color' => '#94a3b8']),
                ],
            ],
        ];
    }

    /** Placeholders a text element may contain. */
    public function tokens(): array
    {
        return [
            '{{restaurant}}' => 'Restaurant name',
            '{{branch}}' => 'Branch name',
            '{{table}}' => 'Table name',
            '{{area}}' => 'Dining area',
        ];
    }

    /**
     * Designs visible for a branch: its own plus the company-wide ones. With no
     * branch selected, every design for the tenant is listed.
     *
     * @return Collection<int, QrCardDesign>
     */
    public function list(Tenant $tenant, ?int $branchId = null): Collection
    {
        return QrCardDesign::query()
            ->where('tenant_id', $tenant->getKey())
            ->when(
                $branchId !== null,
                fn (Builder $q) => $q->where(
                    fn (Builder $inner) => $inner->where('branch_id', $branchId)->orWhereNull('branch_id'),
                ),
            )
            ->with('branch:id,name')
            ->orderBy('name')
            ->get();
    }

    /**
     * The design a branch prints with: its own active design, else the active
     * company-wide design, else the built-in default (persisted on first use).
     */
    public function activeFor(Tenant $tenant, ?Branch $branch = null): QrCardDesign
    {
        $branchId = $branch?->getKey();

        $branchDesign = $branchId !== null
            ? $this->activeQuery($tenant, $branchId)->first()
            : null;

        $design = $branchDesign
            ?? $this->activeQuery($tenant, null)->first();

        if ($design) {
            return $design;
        }

        return $this->create($tenant, null, 'Default table card', $this->defaultCanvas(), null, true);
    }

    public function create(
        Tenant $tenant,
        ?int $branchId,
        string $name,
        ?array $canvas = null,
        ?User $actor = null,
        bool $active = false,
    ): QrCardDesign {
        $design = QrCardDesign::create([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branchId,
            'name' => $this->cleanName($name),
            'canvas' => $this->normalizeCanvas($canvas ?? $this->defaultCanvas()),
            'is_active' => false,
            'created_by' => $actor?->getKey(),
        ]);

        if ($active || ! $this->activeQuery($tenant, $branchId)->exists()) {
            $this->setActive($design);
        }

        $this->audit->log('qr.design_created', $design, ['branch_id' => $branchId], $actor, $tenant->getKey());

        return $design->fresh() ?? $design;
    }

    public function update(QrCardDesign $design, ?string $name, ?array $canvas): QrCardDesign
    {
        $attributes = [];

        if ($name !== null) {
            $attributes['name'] = $this->cleanName($name);
        }

        if ($canvas !== null) {
            $attributes['canvas'] = $this->normalizeCanvas($canvas);
        }

        if ($attributes !== []) {
            $design->forceFill($attributes)->save();
        }

        return $design->fresh() ?? $design;
    }

    public function activate(QrCardDesign $design, ?User $actor = null): QrCardDesign
    {
        $this->setActive($design);

        $this->audit->log('qr.design_activated', $design, ['branch_id' => $design->branch_id], $actor, $design->tenant_id);

        return $design->fresh() ?? $design;
    }

    public function duplicate(QrCardDesign $design, ?User $actor = null): QrCardDesign
    {
        return $this->create(
            $design->tenant,
            $design->branch_id,
            $this->cleanName($design->name.' copy'),
            $design->canvas,
            $actor,
        );
    }

    public function delete(QrCardDesign $design, ?User $actor = null): void
    {
        $this->audit->log('qr.design_deleted', $design, ['branch_id' => $design->branch_id], $actor, $design->tenant_id);

        $design->delete();
    }

    /** Replace the placeholders in a text element for one table. */
    public function substitute(?string $text, Table $table, Tenant $tenant, ?Branch $branch = null): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        return strtr($text, [
            '{{restaurant}}' => $tenant->name,
            '{{branch}}' => $branch?->name ?? '',
            '{{table}}' => $table->name,
            '{{area}}' => $table->diningArea?->name ?? '',
        ]);
    }

    /**
     * Clamp a canvas document to the supported vocabulary. Anything unknown is
     * dropped rather than rendered, so a hand-crafted payload can never inject
     * markup into the printed card.
     *
     * @param  array<string, mixed>  $canvas
     * @return array<string, mixed>
     */
    public function normalizeCanvas(array $canvas): array
    {
        $width = $this->clampNumber($canvas['width_mm'] ?? 100, 40, 420, 100);
        $height = $this->clampNumber($canvas['height_mm'] ?? 150, 40, 594, 150);

        $elements = [];

        foreach (array_slice((array) ($canvas['elements'] ?? []), 0, self::MAX_ELEMENTS) as $index => $element) {
            if (! is_array($element)) {
                continue;
            }

            $type = (string) ($element['type'] ?? '');

            if (! in_array($type, self::ELEMENT_TYPES, true)) {
                continue;
            }

            $elements[] = [
                'id' => $this->cleanId($element['id'] ?? null, $index),
                'type' => $type,
                'x' => $this->clampNumber($element['x'] ?? 0, 0, $width, 0),
                'y' => $this->clampNumber($element['y'] ?? 0, 0, $height, 0),
                'w' => $this->clampNumber($element['w'] ?? 20, 1, $width, 20),
                'h' => $this->clampNumber($element['h'] ?? 10, 1, $height, 10),
                'props' => $this->normalizeProps($type, (array) ($element['props'] ?? [])),
            ];
        }

        return [
            'width_mm' => $width,
            'height_mm' => $height,
            'background' => $this->color($canvas['background'] ?? null, '#ffffff'),
            'elements' => $elements,
        ];
    }

    /** @return list<array{value: string, label: string}> */
    public function fontOptions(): array
    {
        return [
            ['value' => 'sans', 'label' => 'Sans'],
            ['value' => 'serif', 'label' => 'Serif'],
            ['value' => 'mono', 'label' => 'Mono'],
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array<string, mixed>
     */
    protected function normalizeProps(string $type, array $props): array
    {
        return match ($type) {
            'text' => $this->textProps(
                $this->cleanText($props['content'] ?? ''),
                $props,
            ),
            'rect', 'ellipse' => [
                'fill' => $this->color($props['fill'] ?? null, '#ffffff'),
                'border_color' => $this->color($props['border_color'] ?? null, '#e2e8f0'),
                'border_width' => $this->clampNumber($props['border_width'] ?? 0, 0, 5, 0),
                'radius' => $this->clampNumber($props['radius'] ?? 0, 0, 50, 0),
            ],
            'line' => [
                'color' => $this->color($props['color'] ?? null, '#0f172a'),
            ],
            'image' => [
                'source' => ($props['source'] ?? 'logo') === 'path' ? 'path' : 'logo',
                'path' => $this->cleanPath($props['path'] ?? null),
            ],
            'qr' => [
                'margin' => $this->clampNumber($props['margin'] ?? 0, 0, 8, 0),
                'caption' => $this->cleanText($props['caption'] ?? ''),
            ],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function textProps(string $content, array $overrides = []): array
    {
        // Read the raw values once: falling back to a default and then reading
        // the original key would raise "Undefined array key" when it is absent.
        $font = $overrides['font'] ?? 'sans';
        $align = $overrides['align'] ?? 'left';

        return [
            'content' => $content,
            'font' => in_array($font, self::FONTS, true) ? $font : 'sans',
            'size_pt' => $this->clampNumber($overrides['size_pt'] ?? 11, 6, 96, 11),
            'weight' => ($overrides['weight'] ?? 'normal') === 'bold' ? 'bold' : 'normal',
            'italic' => (bool) ($overrides['italic'] ?? false),
            'underline' => (bool) ($overrides['underline'] ?? false),
            'letter_spacing' => $this->clampNumber($overrides['letter_spacing'] ?? 0, -2, 10, 0),
            'line_height' => $this->clampNumber($overrides['line_height'] ?? 1.2, 0.8, 3, 1.2),
            'color' => $this->color($overrides['color'] ?? null, '#0f172a'),
            'align' => in_array($align, ['left', 'center', 'right'], true) ? $align : 'left',
        ];
    }

    protected function setActive(QrCardDesign $design): void
    {
        DB::transaction(function () use ($design) {
            $siblings = QrCardDesign::query()
                ->where('tenant_id', $design->tenant_id)
                ->whereKeyNot($design->getKey());

            $this->scopeBranch($siblings, $design->branch_id);

            $siblings->update(['is_active' => false]);

            $design->forceFill(['is_active' => true])->save();
        });
    }

    protected function activeQuery(Tenant $tenant, ?int $branchId): Builder
    {
        return QrCardDesign::query()
            ->where('tenant_id', $tenant->getKey())
            ->where('is_active', true)
            ->where(fn (Builder $q) => $this->scopeBranch($q, $branchId));
    }

    /** A null branch id means "company-wide", which SQL cannot compare with `=`. */
    protected function scopeBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null
            ? $query->whereNull('branch_id')
            : $query->where('branch_id', $branchId);
    }

    protected function cleanName(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');

        return $name === '' ? 'Untitled design' : mb_substr($name, 0, 60);
    }

    protected function cleanId(mixed $id, int $index): string
    {
        $id = is_string($id) ? preg_replace('/[^A-Za-z0-9_-]/', '', $id) : null;

        return ($id === null || $id === '') ? 'el'.($index + 1) : mb_substr($id, 0, 40);
    }

    /** Strip control characters and hard-cap the length of user text. */
    protected function cleanText(mixed $text): string
    {
        if (! is_string($text)) {
            return '';
        }

        return mb_substr(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '', 0, 300);
    }

    protected function cleanPath(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        $clean = preg_replace('#[^A-Za-z0-9._/-]#', '', $path);

        return ($clean === null || $clean === '' || str_contains($clean, '..')) ? null : mb_substr($clean, 0, 200);
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

    protected function clampNumber(mixed $value, float $min, float $max, float $fallback): float
    {
        if (! is_numeric($value)) {
            return $fallback;
        }

        return round(min($max, max($min, (float) $value)), 2);
    }
}
