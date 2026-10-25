<?php

namespace App\Domain\Tables;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Models\QrCardDesign;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\Storage;

/**
 * Renders a card design for one table. The same HTML feeds the designer's
 * preview and the DomPDF export, so what the restaurant previews is what it
 * prints. Assets (logo, QR, uploaded images) are embedded as data URIs because
 * DomPDF cannot reliably fetch them over HTTP.
 */
class QrCardRenderer
{
    /** Millimetres → points, the unit DomPDF uses for paper size. */
    private const MM_TO_PT = 72 / 25.4;

    public function __construct(
        protected QrCardDesignService $designs,
        protected QrCodeRenderer $qr,
        protected TableQrService $tables,
    ) {}

    /** The page size for a design, as DomPDF expects it: [0, 0, w, h] in points. */
    public function paperPoints(array $canvas): array
    {
        return [
            0,
            0,
            ((float) ($canvas['width_mm'] ?? 100)) * self::MM_TO_PT,
            ((float) ($canvas['height_mm'] ?? 150)) * self::MM_TO_PT,
        ];
    }

    /** One table's card as HTML. */
    public function cardHtml(
        QrCardDesign $design,
        Table $table,
        Tenant $tenant,
        ?Branch $branch = null,
    ): string {
        $canvas = $design->canvas ?? $this->designs->defaultCanvas();
        $url = $this->tables->url($this->tables->ensureToken($table));

        return view('qr.partials.card', [
            'canvas' => $canvas,
            'replace' => $this->replace($table, $tenant, $branch),
            'assets' => $this->assets($canvas, $tenant),
            'qrFor' => fn (int $margin): ?string => $url === '' ? null : $this->qr->dataUri($url, 900, $margin),
        ])->render();
    }

    /**
     * Render a card for each table with one design. A single design is used for
     * the whole run because a PDF only has one page size; each table still gets
     * its own QR and its own branch/area tokens.
     *
     * @param  \Illuminate\Support\Collection<int, Table>  $tables
     * @return list<string>
     */
    public function cardsFor($tables, Tenant $tenant, QrCardDesign $design): array
    {
        $branches = Branch::query()
            ->whereIn('id', $tables->pluck('branch_id')->unique()->all())
            ->get()
            ->keyBy('id');

        return $tables
            ->map(fn (Table $table) => $this->cardHtml($design, $table, $tenant, $branches->get($table->branch_id)))
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    protected function replace(Table $table, Tenant $tenant, ?Branch $branch): array
    {
        if ($table->exists) {
            $table->loadMissing('diningArea:id,name');
        }

        return [
            '{{restaurant}}' => (string) $tenant->name,
            '{{branch}}' => (string) ($branch?->name ?? ''),
            '{{table}}' => (string) $table->name,
            '{{area}}' => (string) ($table->diningArea?->name ?? ''),
        ];
    }

    /**
     * Data URIs for the images a design may reference, keyed by `logo` and by
     * the stored path.
     *
     * @param  array<string, mixed>  $canvas
     * @return array<string, string>
     */
    protected function assets(array $canvas, Tenant $tenant): array
    {
        $assets = [];

        if ($logo = $this->dataUri($tenant->logo_path)) {
            $assets['logo'] = $logo;
        }

        foreach ((array) ($canvas['elements'] ?? []) as $element) {
            if (($element['type'] ?? null) !== 'image') {
                continue;
            }

            $path = $element['props']['path'] ?? null;

            if (! is_string($path) || $path === '' || isset($assets[$path])) {
                continue;
            }

            if ($uri = $this->dataUri($path)) {
                $assets[$path] = $uri;
            }
        }

        return $assets;
    }

    protected function dataUri(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            return null;
        }

        $contents = $disk->get($path);
        $mime = $disk->mimeType($path);
        $mime = is_string($mime) && str_starts_with($mime, 'image/') ? $mime : 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }
}
