<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\QrBrandingSettings;
use App\Domain\Tables\Models\QrCardDesign;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\QrCardDesignService;
use App\Domain\Tables\QrCardRenderer;
use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * The QR design panel: editable card designs (per branch) plus the branding of
 * the customer-facing QR menu page. A design is rendered by the same service the
 * PDF export uses, so the on-screen preview matches the printed card.
 */
class QrDesignController extends Controller
{
    public function __construct(
        protected QrCardDesignService $designs,
        protected QrCardRenderer $cards,
        protected QrBrandingSettings $branding,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $tenant = $request->user()->tenant;
        $accessible = $request->user()->accessibleBranchIds();

        $branchId = $request->integer('branch_id')
            ?: ($tenant->primaryBranch?->getKey() ?? ($accessible[0] ?? null));
        $branch = $branchId ? Branch::query()->find($branchId) : null;

        $tables = Table::query()
            ->whereIn('branch_id', $accessible)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->with('diningArea:id,name')
            ->orderBy('sort_order')->orderBy('name')
            ->limit(100)
            ->get();

        $active = $this->designs->activeFor($tenant, $branch);

        $designs = $this->designs->list($tenant, $branchId);

        return Inertia::render('QrDining/Designer', [
            'branches' => Branch::query()
                ->whereIn('id', $accessible)->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name])
                ->values(),
            'filters' => ['branch_id' => $branchId],
            'designs' => $designs
                ->map(fn (QrCardDesign $design) => $this->designPayload($design))
                ->values(),
            'activeId' => $active->getKey(),
            'defaultCanvas' => $this->designs->defaultCanvas(),
            'tokens' => $this->designs->tokens(),
            'fonts' => $this->designs->fontOptions(),
            'branding' => $this->branding->resolve($tenant, $branch),
            'branding_styles' => $this->branding->headerStyles(),
            'sampleTables' => $tables
                ->map(fn (Table $t) => [
                    'id' => $t->getKey(),
                    'name' => $t->name,
                    'area_name' => $t->diningArea?->name,
                ])->values(),
            'restaurant_name' => $tenant->name,
            'branch_name' => $branch?->name,
            'logo_url' => $tenant->logo_url,
            // Public URLs for any images the designs reference, so the editor can
            // draw them without a round trip.
            'asset_urls' => $designs
                ->flatMap(fn (QrCardDesign $d) => collect($d->canvas['elements'] ?? [])->pluck('props.path'))
                ->filter(fn ($path) => is_string($path) && $path !== '')
                ->unique()
                ->mapWithKeys(fn (string $path) => [$path => Storage::disk('public')->url($path)])
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'branch_id' => [
                'nullable', 'integer',
                Rule::exists('branches', 'id')->where('tenant_id', $tenant->getKey()),
            ],
            'canvas' => ['nullable', 'array'],
            'canvas.elements' => ['nullable', 'array', 'max:'.QrCardDesignService::MAX_ELEMENTS],
        ]);

        $this->designs->create(
            $tenant,
            $data['branch_id'] ?? null,
            $data['name'] ?? 'Table card',
            $data['canvas'] ?? null,
            $request->user(),
            true,
        );

        return back()->with('success', 'Design created.');
    }

    public function update(Request $request, QrCardDesign $design): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:60'],
            'canvas' => ['sometimes', 'array'],
            'canvas.elements' => ['nullable', 'array', 'max:'.QrCardDesignService::MAX_ELEMENTS],
        ]);

        $this->designs->update($design, $data['name'] ?? null, $data['canvas'] ?? null);

        return back()->with('success', 'Design saved.');
    }

    public function activate(Request $request, QrCardDesign $design): RedirectResponse
    {
        $this->designs->activate($design, $request->user());

        return back()->with('success', $design->name.' is now the active design.');
    }

    public function duplicate(Request $request, QrCardDesign $design): RedirectResponse
    {
        $this->designs->duplicate($design, $request->user());

        return back()->with('success', 'Design duplicated.');
    }

    public function destroy(Request $request, QrCardDesign $design): RedirectResponse
    {
        $this->designs->delete($design, $request->user());

        return back()->with('success', 'Design removed.');
    }

    /** The rendered card, used as the authoritative preview inside the designer. */
    public function preview(Request $request, QrCardDesign $design): Response
    {
        $tenant = $request->user()->tenant;
        $table = $this->previewTable($request, $design);

        return response()->view('qr.preview', [
            'card' => $this->cards->cardHtml($design, $table, $tenant, $design->branch),
        ]);
    }

    /** One card per table in the branch, as a print-ready PDF. */
    public function export(Request $request, QrCardDesign $design): Response
    {
        $tenant = $request->user()->tenant;
        $accessible = $request->user()->accessibleBranchIds();

        $branchId = $design->branch_id ?? ($request->integer('branch_id') ?: null);

        $tables = Table::query()
            ->whereIn('branch_id', $accessible)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->with('diningArea:id,name')
            ->orderBy('sort_order')->orderBy('name')
            ->get();

        return Pdf::loadView('qr.print', [
            'canvas' => $design->canvas,
            'cards' => $this->cards->cardsFor($tables, $tenant, $design),
        ])->setPaper($this->cards->paperPoints($design->canvas))
            ->download('qr-card-design-'.$design->getKey().'.pdf');
    }

    /** Upload an image a design may place on a card. */
    public function uploadAsset(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
        ]);

        $tenant = $request->user()->tenant;
        $path = $request->file('image')->store('qr-designs/'.$tenant->getKey(), 'public');

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    public function saveBranding(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        $data = $request->validate([
            'branch_id' => [
                'nullable', 'integer',
                Rule::exists('branches', 'id')->where('tenant_id', $tenant->getKey()),
            ],
            'primary_color' => ['nullable', 'string', 'max:9'],
            'accent_color' => ['nullable', 'string', 'max:9'],
            'background_color' => ['nullable', 'string', 'max:9'],
            'header_style' => ['nullable', Rule::in(['light', 'brand', 'dark'])],
            'show_logo' => ['boolean'],
            'show_table_name' => ['boolean'],
            'welcome_title' => ['nullable', 'string', 'max:200'],
            'welcome_text' => ['nullable', 'string', 'max:200'],
            'footer_text' => ['nullable', 'string', 'max:200'],
        ]);

        $branch = isset($data['branch_id']) && $data['branch_id']
            ? Branch::query()->find($data['branch_id'])
            : null;

        $this->branding->save($tenant, $branch, $data);

        return back()->with('success', 'QR menu branding saved.');
    }

    protected function previewTable(Request $request, QrCardDesign $design): Table
    {
        $accessible = $request->user()->accessibleBranchIds();

        $query = Table::query()
            ->whereIn('branch_id', $accessible)
            ->when($design->branch_id, fn ($q) => $q->where('branch_id', $design->branch_id))
            ->with('diningArea:id,name')
            ->orderBy('sort_order')->orderBy('name');

        $tableId = $request->integer('table_id');

        return ($tableId ? (clone $query)->whereKey($tableId)->first() : null)
            ?? $query->first()
            ?? new Table(['name' => 'Table 1']);
    }

    /** @return array<string, mixed> */
    protected function designPayload(QrCardDesign $design): array
    {
        return [
            'id' => $design->getKey(),
            'name' => $design->name,
            'branch_id' => $design->branch_id,
            'branch_name' => $design->branch?->name,
            'is_active' => $design->is_active,
            'canvas' => $design->canvas,
            'updated_at' => $design->updated_at?->diffForHumans(),
        ];
    }
}
