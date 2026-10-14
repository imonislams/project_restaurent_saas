<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Product catalogue</title>
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 11px; color: #1f2937; }
        h1 { font-size: 16px; margin: 0 0 2px; }
        .muted { color: #6b7280; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
        td.num, th.num { text-align: right; }
        .inactive { color: #9ca3af; }
    </style>
</head>
<body>
    <h1>{{ $tenant?->name ?? 'Products' }} — Product catalogue</h1>
    <div class="muted">Generated {{ $generatedAt->format('Y-m-d H:i') }} · {{ $products->count() }} item(s)</div>

    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Category</th>
                <th>SKU</th>
                <th class="num">Dine-in</th>
                <th class="num">Takeaway</th>
                <th class="num">Delivery</th>
                <th class="num">Cost</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($products as $product)
                <tr class="{{ $product->is_active ? '' : 'inactive' }}">
                    <td>{{ $product->name }}</td>
                    <td>{{ $product->category?->name ?? '—' }}</td>
                    <td>{{ $product->sku ?? '—' }}</td>
                    <td class="num">{{ number_format((float) $product->price_dine_in, 2) }}</td>
                    <td class="num">{{ number_format((float) $product->price_takeaway, 2) }}</td>
                    <td class="num">{{ number_format((float) $product->price_delivery, 2) }}</td>
                    <td class="num">{{ number_format((float) $product->cost_price, 2) }}</td>
                    <td>{{ $product->is_active ? 'Active' : 'Inactive' }}</td>
                </tr>
            @empty
                <tr><td colspan="8">No products.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
