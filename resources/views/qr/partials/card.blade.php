{{--
    One printable QR card. Shared by the designer preview and the PDF export so
    the two cannot drift. Positions are in millimetres and only the PDF-safe
    element vocabulary is rendered (no rotation, gradients or shadows), which is
    all DomPDF can reproduce faithfully.
--}}
@php
    $width = (float) ($canvas['width_mm'] ?? 100);
    $height = (float) ($canvas['height_mm'] ?? 150);
    $fonts = [
        'sans' => 'DejaVu Sans',
        'serif' => 'DejaVu Serif',
        'mono' => 'DejaVu Sans Mono',
    ];
@endphp
<div class="qr-card" style="position: relative; width: {{ $width }}mm; height: {{ $height }}mm; background: {{ $canvas['background'] ?? '#ffffff' }}; overflow: hidden;">
    @foreach (($canvas['elements'] ?? []) as $element)
        @php
            $props = $element['props'] ?? [];
            $box = 'position: absolute;'
                .' left: '.((float) $element['x']).'mm;'
                .' top: '.((float) $element['y']).'mm;'
                .' width: '.((float) $element['w']).'mm;'
                .' height: '.((float) $element['h']).'mm;';
        @endphp

        @switch($element['type'])
            @case('rect')
                <div style="{{ $box }} background: {{ $props['fill'] ?? '#ffffff' }}; border-radius: {{ $props['radius'] ?? 0 }}mm; @if (($props['border_width'] ?? 0) > 0) border: {{ $props['border_width'] }}mm solid {{ $props['border_color'] ?? '#e2e8f0' }}; @endif"></div>
                @break

            @case('ellipse')
                <div style="{{ $box }} background: {{ $props['fill'] ?? '#ffffff' }}; border-radius: 50%; @if (($props['border_width'] ?? 0) > 0) border: {{ $props['border_width'] }}mm solid {{ $props['border_color'] ?? '#e2e8f0' }}; @endif"></div>
                @break

            @case('line')
                <div style="{{ $box }} background: {{ $props['color'] ?? '#0f172a' }};"></div>
                @break

            @case('text')
                <div style="{{ $box }} font-family: '{{ $fonts[$props['font'] ?? 'sans'] ?? 'DejaVu Sans' }}'; font-size: {{ $props['size_pt'] ?? 11 }}pt; font-weight: {{ $props['weight'] ?? 'normal' }}; font-style: {{ ! empty($props['italic']) ? 'italic' : 'normal' }}; text-decoration: {{ ! empty($props['underline']) ? 'underline' : 'none' }}; letter-spacing: {{ $props['letter_spacing'] ?? 0 }}pt; line-height: {{ $props['line_height'] ?? 1.2 }}; color: {{ $props['color'] ?? '#0f172a' }}; text-align: {{ $props['align'] ?? 'left' }}; overflow: hidden;">{{ e(strtr($props['content'] ?? '', $replace)) }}</div>
                @break

            @case('image')
                @php
                    $source = ($props['source'] ?? 'logo') === 'path'
                        ? ($assets[$props['path'] ?? ''] ?? null)
                        : ($assets['logo'] ?? null);
                @endphp
                @if ($source)
                    <img src="{{ $source }}" alt="" style="{{ $box }}">
                @endif
                @break

            @case('qr')
                @php $qrImage = $qrFor((int) ($props['margin'] ?? 0)); @endphp
                @if ($qrImage)
                    <img src="{{ $qrImage }}" alt="" style="{{ $box }}">
                @endif
                @break
        @endswitch
    @endforeach
</div>
