<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

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
