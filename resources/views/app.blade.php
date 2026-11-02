@php
    // Metadata resolved server-side by ApplySeoMetadata. Emitting it here means a
    // crawler that runs no JavaScript still sees a real title, description,
    // canonical and Open Graph block. The `inertia` attribute lets Inertia adopt
    // these elements, so client-side navigation updates them instead of adding
    // duplicates.
    $seo = isset($page['props']['seo']) && is_array($page['props']['seo']) ? $page['props']['seo'] : null;
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        <title inertia>{{ $seo['full_title'] ?? config('app.name', 'Laravel') }}</title>

        @if ($seo)
            <meta inertia name="description" content="{{ $seo['description'] }}">
            <link inertia rel="canonical" href="{{ $seo['canonical'] }}">
            <meta inertia name="robots" content="{{ $seo['robots'] }}">

            <meta inertia property="og:title" content="{{ $seo['og']['title'] }}">
            <meta inertia property="og:description" content="{{ $seo['og']['description'] }}">
            <meta inertia property="og:type" content="{{ $seo['og']['type'] }}">
            <meta inertia property="og:url" content="{{ $seo['og']['url'] }}">
            <meta inertia property="og:image" content="{{ $seo['og']['image'] }}">
            <meta inertia property="og:site_name" content="{{ $seo['og']['site_name'] }}">

            <meta inertia name="twitter:card" content="{{ $seo['twitter']['card'] }}">
            <meta inertia name="twitter:title" content="{{ $seo['twitter']['title'] }}">
            <meta inertia name="twitter:description" content="{{ $seo['twitter']['description'] }}">
            <meta inertia name="twitter:image" content="{{ $seo['twitter']['image'] }}">

            @if (! empty($seo['verification']['google']))
                <meta inertia name="google-site-verification" content="{{ $seo['verification']['google'] }}">
            @endif

            @if (! empty($seo['schema']))
                {{-- JSON_HEX_TAG keeps a stray "</script>" in stored metadata from
                     breaking out of the block. --}}
                <script inertia type="application/ld+json">{!! json_encode($seo['schema'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
            @endif
        @endif

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <meta name="theme-color" content="#EC3013">

        <!-- Web app metadata (manifest and service worker are build artifacts) -->
        <link rel="manifest" href="/build/manifest.webmanifest">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Touch Dine">

        <!-- Fonts & Icons -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
