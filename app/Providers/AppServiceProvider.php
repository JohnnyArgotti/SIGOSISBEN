<?php

namespace App\Providers;

use App\Contracts\DirectoryAuthenticator;
use App\Services\ActiveDirectoryAuthenticationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Proveedor de autenticación de directorio. Vincular el contrato a una
        // implementación concreta permite reemplazar el proveedor (Active
        // Directory, OpenLDAP, IdP futuro) sin modificar el resto del SIGO.
        $this->app->bind(
            DirectoryAuthenticator::class,
            ActiveDirectoryAuthenticationService::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureTrustedProxies();
    }

    /**
     * Declara desde qué orígenes se acepta la cabecera X-Forwarded-For, de lo
     * que depende que request()->ip() sea la IP real del usuario y no la del
     * proxy inverso.
     *
     * Va aquí y no en bootstrap/app.php porque el closure de withMiddleware()
     * se ejecuta al resolver el kernel HTTP, antes de que se carguen el .env y
     * la configuración: allí, env() y config() devuelven siempre vacío y el
     * valor del .env se perdería en silencio. Los proveedores, en cambio,
     * arrancan antes de que se ejecute el middleware, así que este es el
     * momento correcto.
     *
     * Se limita a X-Forwarded-For a propósito, para no alterar cómo se
     * resuelven el esquema y el host.
     */
    protected function configureTrustedProxies(): void
    {
        $proxies = (array) config('sigo.trusted_proxies', []);

        if ($proxies === []) {
            return;
        }

        TrustProxies::at($proxies);
        TrustProxies::withHeaders(Request::HEADER_X_FORWARDED_FOR);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Política institucional: entre 8 y 12 caracteres, con al menos una
        // mayúscula, una minúscula y un número (los símbolos no son
        // obligatorios). Rige en todos los entornos; solo la verificación
        // contra contraseñas filtradas (uncompromised, que consulta un
        // servicio externo) se limita a producción para no depender de red
        // en local/pruebas.
        Password::defaults(function (): Password {
            $regla = Password::min(8)
                ->max(12)
                ->mixedCase()
                ->letters()
                ->numbers();

            return app()->isProduction() ? $regla->uncompromised() : $regla;
        });
    }
}
