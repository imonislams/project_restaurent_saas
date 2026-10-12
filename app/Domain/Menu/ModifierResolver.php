<?php

namespace App\Domain\Menu;

use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use Illuminate\Validation\ValidationException;

/**
 * Validates and resolves the modifier selections for an order line against the
 * groups attached to the product, enforcing required/min/max rules server-side.
 */
class ModifierResolver
{
    /**
     * @param  list<array{option_id?: int|string, quantity?: float|string}>  $selections
     * @return list<array{option_id: int, group_name: string, name: string, price_delta: float, quantity: float}>
     */
    public function resolve(Product $product, array $selections): array
    {
        /** @var \Illuminate\Support\Collection<int, \App\Domain\Menu\Models\ModifierGroup> $groups */
        $groups = $product->modifierGroups()->with('options')->get();

        if ($groups->isEmpty()) {
            if ($selections !== []) {
                throw ValidationException::withMessages([
                    'items' => "\"{$product->name}\" does not accept modifiers.",
                ]);
            }

            return [];
        }

        // Index every option that is legitimately selectable for this product.
        $allowed = [];
        foreach ($groups as $group) {
            foreach ($group->options as $option) {
                $allowed[$option->getKey()] = [$group, $option];
            }
        }

        $counts = [];
        $resolved = [];

        foreach ($selections as $selection) {
            $optionId = (int) ($selection['option_id'] ?? 0);

            if (! isset($allowed[$optionId])) {
                throw ValidationException::withMessages([
                    'items' => "A selected modifier is not valid for \"{$product->name}\".",
                ]);
            }

            /** @var ModifierOption $option */
            [$group, $option] = $allowed[$optionId];

            if (! $option->is_active || ! $group->is_active) {
                throw ValidationException::withMessages([
                    'items' => "A selected modifier is unavailable for \"{$product->name}\".",
                ]);
            }

            $counts[$group->getKey()] = ($counts[$group->getKey()] ?? 0) + 1;

            $resolved[] = [
                'option_id' => $option->getKey(),
                'group_name' => $group->name,
                'name' => $option->name,
                'price_delta' => (float) $option->price_delta,
                'quantity' => max(1.0, round((float) ($selection['quantity'] ?? 1), 3)),
            ];
        }

        foreach ($groups as $group) {
            $count = $counts[$group->getKey()] ?? 0;
            $min = $group->effectiveMin();
            $max = $group->effectiveMax();

            if ($count < $min) {
                throw ValidationException::withMessages([
                    'items' => "Choose at least {$min} option(s) for \"{$group->name}\" on \"{$product->name}\".",
                ]);
            }

            if ($count > $max) {
                throw ValidationException::withMessages([
                    'items' => "Choose at most {$max} option(s) for \"{$group->name}\" on \"{$product->name}\".",
                ]);
            }
        }

        return $resolved;
    }
}
