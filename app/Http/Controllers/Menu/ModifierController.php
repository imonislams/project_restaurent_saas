<?php

namespace App\Http\Controllers\Menu;

use App\Domain\Menu\Enums\ModifierSelectionType;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\ModifierGroupRequest;
use App\Http\Requests\Menu\ModifierOptionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Modifier / add-on management: reusable option groups attached to products.
 */
class ModifierController extends Controller
{
    public function index(Request $request): Response
    {
        $groups = ModifierGroup::query()
            ->with(['options', 'products:id,name'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ModifierGroup $group) => [
                'id' => $group->getKey(),
                'name' => $group->name,
                'selection_type' => $group->selection_type->value,
                'min_select' => $group->min_select,
                'max_select' => $group->max_select,
                'is_required' => $group->is_required,
                'sort_order' => $group->sort_order,
                'is_active' => $group->is_active,
                'product_ids' => $group->products->pluck('id')->all(),
                'options' => $group->options->map(fn (ModifierOption $option) => [
                    'id' => $option->getKey(),
                    'name' => $option->name,
                    'sku' => $option->sku,
                    'price_delta' => (float) $option->price_delta,
                    'is_default' => $option->is_default,
                    'is_active' => $option->is_active,
                    'sort_order' => $option->sort_order,
                ])->values(),
            ]);

        $products = Product::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Product $product) => ['id' => $product->getKey(), 'name' => $product->name]);

        return Inertia::render('Menu/Modifiers', [
            'groups' => $groups,
            'products' => $products,
            'selectionTypes' => collect(ModifierSelectionType::cases())
                ->map(fn (ModifierSelectionType $type) => ['value' => $type->value, 'label' => $type->label()])
                ->values(),
        ]);
    }

    public function storeGroup(ModifierGroupRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $group = ModifierGroup::create($this->groupAttributes($data));

        $this->syncOptions($group, $data['options'] ?? []);
        $group->products()->sync($data['products'] ?? []);

        return back()->with('success', 'Modifier group created.');
    }

    public function updateGroup(ModifierGroupRequest $request, ModifierGroup $group): RedirectResponse
    {
        $data = $request->validated();

        $group->update($this->groupAttributes($data));

        $this->syncOptions($group, $data['options'] ?? []);
        $group->products()->sync($data['products'] ?? []);

        return back()->with('success', 'Modifier group updated.');
    }

    public function destroyGroup(ModifierGroup $group): RedirectResponse
    {
        $group->products()->detach();
        $group->delete();

        return back()->with('success', 'Modifier group removed.');
    }

    public function storeOption(ModifierOptionRequest $request): RedirectResponse
    {
        ModifierOption::create($request->validated());

        return back()->with('success', 'Modifier option created.');
    }

    public function updateOption(ModifierOptionRequest $request, ModifierOption $option): RedirectResponse
    {
        $option->update($request->validated());

        return back()->with('success', 'Modifier option updated.');
    }

    public function destroyOption(ModifierOption $option): RedirectResponse
    {
        $option->delete();

        return back()->with('success', 'Modifier option removed.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function groupAttributes(array $data): array
    {
        return [
            'name' => $data['name'],
            'selection_type' => $data['selection_type'],
            'min_select' => $data['min_select'] ?? 0,
            'max_select' => $data['max_select'] ?? 1,
            'is_required' => $data['is_required'] ?? false,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $options
     */
    protected function syncOptions(ModifierGroup $group, array $options): void
    {
        $group->options()->delete();

        foreach (array_values($options) as $index => $option) {
            $group->options()->create([
                'tenant_id' => $group->tenant_id,
                'name' => $option['name'],
                'sku' => $option['sku'] ?? null,
                'price_delta' => $option['price_delta'] ?? 0,
                'is_default' => $option['is_default'] ?? false,
                'is_active' => $option['is_active'] ?? true,
                'sort_order' => $option['sort_order'] ?? $index,
            ]);
        }
    }
}
