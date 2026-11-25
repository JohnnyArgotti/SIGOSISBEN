<?php

use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckSessionInactivity;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Los proxies de confianza NO se configuran aquí: este closure se
        // ejecuta al resolver el kernel HTTP, antes de que el framework cargue
        // el .env y la configuración, así que cualquier env() o config() de
        // este bloque quedaría vacío. Se configuran en AppServiceProvider.
        $middleware->encryptCookies(except: ['sidebar_state']);

        // Cabeceras de seguridad en TODA respuesta, incluidas las que no llegan
        // a una ruta (404) o se cortan antes del grupo web (419, token CSRF
        // inválido): por eso va en la pila global y no en el grupo web.
        $middleware->append(SecurityHeaders::class);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'punto' => \App\Http\Middleware\VerificarPuntoAtencion::class,
            'inactividad' => CheckSessionInactivity::class,
        ]);

        
    })
    
    
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
