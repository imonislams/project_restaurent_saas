<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Tables\Models\DiningArea;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\QrCodeRenderer;
use App\Domain\Tables\TableQrService;
use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Smart Table QR Manager: per-table QR identity, preview, download and printing.
 */
class QrTableController extends Controller
{
    /** @var list<string> */
    private const ACTIVE_SESSION_STATUSES = ['open', 'bill_requested', 'settling'];

    public function __construct(
        protected TableQrService $qr,
        protected QrCodeRenderer $renderer,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenant = $user->tenant;
        $accessible = $user->accessibleBranchIds();

        $branchId = $request->integer('branch_id')
            ?: ($tenant->primaryBranch?->getKey() ?? ($accessible[0] ?? null));
        $areaId = $request->integer('area_id') ?: null;
        $search = $request->string('search')->toString();

        $tables = Table::query()
            ->whereIn('branch_id', $accessible)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($areaId, fn ($q) => $q->where('dining_area_id', $areaId))
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->with(['diningArea:id,name'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Table $table) => $this->tablePayload($table, $user));

        return Inertia::render('QrDining/Tables', [
            'tables' => $tables,
            'branches' => \App\Domain\Branches\Models\Branch::query()
                ->whereIn('id', $accessible)->orderBy('name')->get()
                ->map(fn ($b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'areas' => DiningArea::query()
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn (DiningArea $a) => ['id' => $a->getKey(), 'name' => $a->name]),
            'filters' => ['branch_id' => $branchId, 'area_id' => $areaId, 'search' => $search],
            'stats' => [
                'total' => $tables->count(),
                'active' => $tables->where('is_active', true)->count(),
                'occupied' => $tables->whereNotNull('session')->count(),
            ],
        ]);
    }

    public function regenerate(Request $request, Table $table): \Illuminate\Http\RedirectResponse
    {
        $this->qr->regenerate($table, $request->user());

        return back()->with('success', 'A new QR code was generated for '.$table->name.'.');
    }

    public function revoke(Request $request, Table $table): \Illuminate\Http\RedirectResponse
    {
        $this->qr->revoke($table);

        return back()->with('success', 'The QR code for '.$table->name.' was revoked.');
    }

    /** Stream the table's QR as PNG (default) or SVG. */
    public function qr(Request $request, Table $table): HttpResponse
    {
        $token = $this->qr->ensureToken($table, $request->user());
        $url = $this->qr->url($token);
        $size = min(1024, max(96, (int) $request->integer('size', 320)));
        $download = $request->boolean('download');
        $format = $request->string('format')->toString() === 'svg' ? 'svg' : 'png';

        $body = $format === 'svg'
            ? $this->renderer->svg($url, $size)
            : $this->renderer->png($url, $size);

        $filename = 'table-'.preg_replace('/[^A-Za-z0-9]+/', '-', $table->name).'-qr.'.$format;

        return response($body, 200, [
            'Content-Type' => $format === 'svg' ? 'image/svg+xml' : 'image/png',
            'Content-Disposition' => ($download ? 'attachment' : 'inline').'; filename="'.$filename.'"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    /** Printable PDF of table tent cards for the selected tables / branch. */
    public function print(Request $request): HttpResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;
        $accessible = $user->accessibleBranchIds();

        $branchId = $request->integer('branch_id') ?: null;
        $ids = collect($request->input('table_ids', []))->map(fn ($id) => (int) $id)->filter()->all();

        $tables = Table::query()
            ->whereIn('branch_id', $accessible)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($ids !== [], fn ($q) => $q->whereIn('id', $ids))
            ->with('diningArea:id,name')
            ->orderBy('sort_order')->orderBy('name')
            ->get();

        $cards = $tables->map(function (Table $table) use ($user) {
            $url = $this->qr->url($this->qr->ensureToken($table, $user));

            return [
                'name' => $table->name,
                'area' => $table->diningArea?->name,
                'url' => $url,
                'png' => $this->renderer->dataUri($url, 360, 6),
            ];
        });

        $branch = $branchId ? \App\Domain\Branches\Models\Branch::query()->find($branchId) : null;

        return Pdf::loadView('qr.print', [
            'tenantName' => $tenant->name,
            'branchName' => $branch?->name,
            'cards' => $cards,
        ])->setPaper('a4')->download('table-qr-codes.pdf');
    }

    /**
     * @return array<string, mixed>
     */
    protected function tablePayload(Table $table, $user): array
    {
        $token = $this->qr->ensureToken($table, $user);

        $session = $table->diningSessions()
            ->whereIn('status', self::ACTIVE_SESSION_STATUSES)
            ->latest('id')
            ->first();

        return [
            'id' => $table->getKey(),
            'name' => $table->name,
            'seats' => $table->seats,
            'status' => $table->status->value,
            'is_active' => $table->is_active,
            'area_name' => $table->diningArea?->name,
            'qr_url' => $this->qr->url($token),
            'qr_active' => $token->isUsable(),
            'scan_count' => (int) $token->scan_count,
            'last_scanned_at' => $token->last_scanned_at?->diffForHumans(),
            'session' => $session ? [
                'id' => $session->getKey(),
                'status' => $session->status->value,
                'orders_count' => $session->orders()->count(),
                'total' => (float) $session->orders()
                    ->whereNotIn('status', ['voided'])->sum('total'),
            ] : null,
        ];
    }
}
