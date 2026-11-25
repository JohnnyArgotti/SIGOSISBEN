<!DOCTYPE html>
{{-- Idioma fijo: el aplicativo es solo en español y el navegador se guía por este atributo para ofrecer (o no) traducir la página --}}
<html lang="es-CO">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        {{-- Nonce de la CSP para los <style> que se insertan desde JavaScript (resources/js/lib/csp-nonce.ts) --}}
        <meta name="csp-nonce" content="{{ Vite::cspNonce() }}">

        {{-- El aplicativo usa siempre el modo claro; no se detecta ni aplica preferencia del sistema --}}
        <style nonce="{{ Vite::cspNonce() }}">
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.png" type="image/png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- La tipografia se empaqueta con los assets del sitio; no se consultan CDN externos --}}

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
