<?php

namespace App\Services\Auth;

use App\Contracts\DirectoryAuthenticator;
use App\Models\User;
use App\Services\AuditoriaService;
use App\Services\Ldap\DirectoryUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

/**
 * Orquesta el flujo de autenticación híbrida (Local + Active Directory).
 *
 * Coordina la autenticación local existente con el proveedor de directorio
 * (a través del contrato DirectoryAuthenticator), la provisión automática de
 * usuarios institucionales, la sincronización de datos y la administración
 * idempotente del rol de Super Administrador.
 *
 * La AUTORIZACIÓN (roles/permisos) sigue siendo responsabilidad exclusiva del
 * SIGO mediante Spatie Permission. Este servicio nunca contiene lógica LDAP:
 * delega esa responsabilidad en el DirectoryAuthenticator.
 */
class LoginService
{
    /**
     * Respuesta única ante cualquier fallo de credenciales.
     *
     * No distingue entre usuario inexistente, contraseña incorrecta, cuenta
     * desactivada ni número de intentos restantes: cualquier diferencia en la
     * respuesta permitiría enumerar qué nombres de usuario existen en la
     * institución.
     *
     * La segunda frase se dirige al usuario legítimo que se autobloqueó por
     * olvido de su contraseña y, al no recibir ya un aviso explícito de la
     * desactivación, no sabría por qué sigue sin poder entrar. Orienta sin
     * filtrar nada, porque la reciben todos por igual: quien acierta el
     * nombre de un usuario real y quien no.
     */
    private const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos. Si el problema persiste, '
        .'tu cuenta puede estar bloqueada; contacta al administrador.';

    private const TIPO_LOCAL = 'local';

    private const TIPO_AD = 'directorio_activo';

    public function __construct(
        private readonly DirectoryAuthenticator $directory,
        private readonly AuditoriaService $auditoria,
        private readonly LoginThrottleService $throttle,
    ) {}

    /**
     * Autentica al usuario y devuelve el modelo autenticado.
     *
     * @throws ValidationException Cuando la autenticación o la validación posterior fallan.
     */
    public function authenticate(string $username, string $password, ?string $ip = null): User
    {
        $ip = $ip ?? (string) request()->ip();

        // El rate limit se evalúa antes de tocar la base de datos, para que
        // actúe igual exista o no el nombre de usuario recibido.
        $this->throttle->asegurarNoBloqueado($username, $ip);

        $user = User::where('nombre_usuario', $username)->first();

        // Paso 3: usuario existente con autenticación LOCAL.
        if ($user && ! $user->autenticacion_ad) {
            return $this->autenticarLocal($user, $password, $ip);
        }

        // Paso 3 (AD) y Paso 4: usuario AD existente o usuario inexistente.
        return $this->autenticarPorDirectorio($username, $password, $ip);
    }

    /**
     * Mecanismo de autenticación local existente (PostgreSQL + Hash).
     */
    private function autenticarLocal(User $user, string $password, string $ip): User
    {
        $maxIntentos = $this->maxIntentos();

        if (! Hash::check($password, (string) $user->contrasena)) {
            $this->registrarIntentoFallido($user);

            // La desactivación por intentos fallidos ocurre y se audita, pero
            // NO se anuncia: avisar de ella ante una contraseña incorrecta
            // confirmaría que el nombre de usuario existe y que es local, que
            // es justo lo que busca quien enumera cuentas. Al usuario legítimo
            // se le informa más abajo, en la comprobación de cuenta inactiva
            // que sigue al Hash::check exitoso: allí ya demostró conocer su
            // contraseña, así que la información no llega a un tercero.
            // La guarda sobre $user->estado evita repetir el registro de
            // 'cuenta_bloqueada' en cada intento posterior a la desactivación.
            if ($user->estado && $user->intentos_fallidos >= $maxIntentos) {
                $user->estado = false;
                $user->save();

                $this->auditoria->registrar(
                    evento: 'cuenta_bloqueada',
                    entidad: 'Usuario',
                    entidadId: $user->id,
                    descripcion: 'Cuenta desactivada automáticamente tras '.$maxIntentos.' intentos fallidos.',
                    usuarioId: $user->id,
                );
            } else {
                $this->auditoria->registrar(
                    evento: 'login_fallido',
                    entidad: 'Usuario',
                    entidadId: $user->id,
                    descripcion: "[local] Contraseña incorrecta (intento {$user->intentos_fallidos} de ".$maxIntentos.').',
                    usuarioId: $user->id,
                );
            }

            $this->throttle->registrarFallo($user->nombre_usuario, $ip);

            throw ValidationException::withMessages([
                'nombre_usuario' => self::MENSAJE_CREDENCIALES,
            ]);
        }

        if (! $user->estado) {
            $this->auditoria->registrar(
                evento: 'login_fallido',
                entidad: 'Usuario',
                entidadId: $user->id,
                descripcion: '[local] Intento de inicio de sesión con cuenta inactiva.',
                usuarioId: $user->id,
            );

            throw ValidationException::withMessages([
                'nombre_usuario' => 'Tu cuenta se encuentra inactiva. Contacta al administrador.',
            ]);
        }

        $user->intentos_fallidos = 0;
        $user->ultimo_intento_fallido = null;
        $user->save();

        $this->throttle->limpiar($user->nombre_usuario, $ip);

        $this->registrarLoginExitoso($user, self::TIPO_LOCAL);

        return $user;
    }

    /**
     * Contabiliza un intento fallido sobre la cuenta.
     *
     * El contador solo refleja intentos *consecutivos y recientes*: si desde
     * el último fallo transcurrió la ventana configurada, se descarta el
     * historial previo y este intento empieza de nuevo en 1. Así, quien se
     * equivoca de forma esporádica nunca acumula hasta la desactivación.
     */
    private function registrarIntentoFallido(User $user): void
    {
        $ventana = max(1, (int) config('sigo.login.minutos_reinicio_intentos', 30));
        $ultimo = $user->ultimo_intento_fallido;

        $vigente = $ultimo !== null && $ultimo->gt(now()->subMinutes($ventana));

        // El tope evita desbordar la columna si una cuenta ya desactivada
        // sigue recibiendo intentos indefinidamente.
        $user->intentos_fallidos = min(255, ($vigente ? (int) $user->intentos_fallidos : 0) + 1);
        $user->ultimo_intento_fallido = now();
        $user->save();
    }

    private function maxIntentos(): int
    {
        return max(1, (int) config('sigo.login.max_intentos', 5));
    }

    /**
     * Autenticación contra Active Directory (usuario AD existente o provisión).
     */
    private function autenticarPorDirectorio(string $username, string $password, string $ip): User
    {
        $identidad = $this->directory->autenticar($username, $password);

        if (! $identidad) {
            $this->auditoria->registrar(
                evento: 'login_fallido',
                descripcion: "[directorio_activo] Credenciales inválidas para el usuario: {$username}",
            );

            $this->throttle->registrarFallo($username, $ip);

            throw ValidationException::withMessages([
                'nombre_usuario' => self::MENSAJE_CREDENCIALES,
            ]);
        }

        $user = $this->resolverUsuarioAd($identidad, $username);

        $this->sincronizarInformacionInstitucional($user, $identidad);
        $this->sincronizarSuperAdministrador($user, $identidad);
        $this->validarAccesoPosterior($user);

        $this->throttle->limpiar($username, $ip);

        $this->registrarLoginExitoso($user, self::TIPO_AD);

        return $user;
    }

    /**
     * Resuelve el usuario local vinculado a la identidad de AD.
     *
     * El vínculo permanente es el ad_guid: aunque cambie el username o el
     * correo, el usuario del SIGO sigue siendo el mismo. Si no existe, se
     * provisiona automáticamente sin asignar roles.
     */
    private function resolverUsuarioAd(DirectoryUser $identidad, string $username): User
    {
        $user = User::where('ad_guid', $identidad->guid)->first()
            ?? User::where('nombre_usuario', $username)->first();

        if ($user) {
            return $user;
        }

        // Paso 4: creación automática del usuario institucional.
        $user = new User;
        $user->autenticacion_ad = true;
        $user->ad_guid = $identidad->guid;
        $user->nombre_usuario = $identidad->username !== '' ? $identidad->username : $username;
        $user->nombres = $identidad->nombres;
        $user->apellidos = $identidad->apellidos;
        $user->correo = $identidad->correo;
        $user->estado = true;
        $user->save();

        $this->auditoria->registrar(
            evento: 'usuario_provisionado',
            entidad: 'Usuario',
            entidadId: $user->id,
            descripcion: "[directorio_activo] Usuario provisionado automáticamente desde AD: {$user->nombre_usuario}",
            usuarioId: $user->id,
        );

        return $user;
    }

    /**
     * Mantiene sincronizada la información institucional en cada inicio de
     * sesión. AD es la única fuente de verdad de estos datos.
     */
    private function sincronizarInformacionInstitucional(User $user, DirectoryUser $identidad): void
    {
        $user->autenticacion_ad = true;

        // El ad_guid es inmutable; solo se establece si aún no estaba vinculado.
        if (empty($user->ad_guid)) {
            $user->ad_guid = $identidad->guid;
        }

        if ($identidad->username !== '') {
            $user->nombre_usuario = $identidad->username;
        }

        $user->nombres = $identidad->nombres ?? $user->nombres;
        $user->apellidos = $identidad->apellidos ?? $user->apellidos;
        $user->correo = $identidad->correo ?? $user->correo;

        if ($user->isDirty()) {
            $user->save();
        }
    }

    /**
     * Administra de forma idempotente el rol de Super Administrador según la
     * pertenencia al grupo de AD configurado. El grupo de AD es la única
     * fuente de verdad para este rol.
     */
    private function sincronizarSuperAdministrador(User $user, DirectoryUser $identidad): void
    {
        $grupoAdmin = config('sigo.active_directory.admin_group');
        $rolAdmin = (string) config('sigo.active_directory.admin_role', 'Administrador');

        if (empty($grupoAdmin) || $rolAdmin === '') {
            return;
        }

        $esAdmin = $identidad->perteneceAlGrupo($grupoAdmin);
        $tieneRol = $user->hasRole($rolAdmin);

        if ($esAdmin && ! $tieneRol) {
            Role::findOrCreate($rolAdmin, 'web');
            $user->assignRole($rolAdmin);

            $this->auditoria->registrar(
                evento: 'rol_asignado_ad',
                entidad: 'Usuario',
                entidadId: $user->id,
                descripcion: "[directorio_activo] Rol '{$rolAdmin}' asignado por pertenencia al grupo '{$grupoAdmin}'.",
                usuarioId: $user->id,
            );
        } elseif (! $esAdmin && $tieneRol) {
            $user->removeRole($rolAdmin);

            $this->auditoria->registrar(
                evento: 'rol_removido_ad',
                entidad: 'Usuario',
                entidadId: $user->id,
                descripcion: "[directorio_activo] Rol '{$rolAdmin}' removido por dejar de pertenecer al grupo '{$grupoAdmin}'.",
                usuarioId: $user->id,
            );
        }

        $user->load('roles');
    }

    /**
     * Validación posterior a la autenticación AD.
     * Solo bloquea si la cuenta está inactiva. La ausencia de roles NO es un
     * error de autenticación: el controlador redirige al usuario a la página
     * de acceso pendiente para que sea informado sin perder el contexto.
     */
    private function validarAccesoPosterior(User $user): void
    {
        if (! $user->estado) {
            $this->auditoria->registrar(
                evento: 'login_fallido',
                entidad: 'Usuario',
                entidadId: $user->id,
                descripcion: '[directorio_activo] Acceso denegado: cuenta inactiva.',
                usuarioId: $user->id,
            );

            throw ValidationException::withMessages([
                'nombre_usuario' => 'Tu cuenta se encuentra inactiva. Contacta al administrador.',
            ]);
        }
    }

    private function registrarLoginExitoso(User $user, string $tipo): void
    {
        $this->auditoria->registrar(
            evento: 'login_exitoso',
            entidad: 'Usuario',
            entidadId: $user->id,
            descripcion: "[{$tipo}] Inicio de sesión exitoso.",
            usuarioId: $user->id,
        );
    }
}
