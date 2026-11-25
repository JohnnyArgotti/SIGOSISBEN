<?php

namespace App\Services;

use App\Contracts\DirectoryAuthenticator;
use App\Services\Ldap\DirectoryUser;
use Illuminate\Support\Facades\Log;
use LdapRecord\Container;
use LdapRecord\Models\ActiveDirectory\User as LdapUser;
use Throwable;

/**
 * Servicio de autenticación contra Active Directory (LDAP).
 *
 * RESPONSABILIDAD ÚNICA: encapsular por completo la interacción con el
 * Directorio Activo mediante LdapRecord. Valida identidad y contraseña,
 * obtiene los atributos institucionales y los grupos del usuario.
 *
 * No conoce roles, permisos ni persistencia del SIGO: solo identidad.
 * Toda la lógica LDAP vive aquí para permitir reemplazar el proveedor sin
 * tocar el resto del sistema (ver contrato DirectoryAuthenticator).
 */
class ActiveDirectoryAuthenticationService implements DirectoryAuthenticator
{
    public function estaHabilitado(): bool
    {
        return (bool) config('sigo.active_directory.enabled', false);
    }

    public function autenticar(string $username, string $password): ?DirectoryUser
    {
        if (! $this->estaHabilitado()) {
            return null;
        }

        // Defensa adicional: nunca intentar bind con contraseña vacía,
        // ya que muchos servidores LDAP lo interpretan como bind anónimo.
        if (trim($username) === '' || $password === '') {
            return null;
        }

        try {
            $usernameAttribute = (string) config('sigo.active_directory.username_attribute', 'samaccountname');

            $ldapUser = LdapUser::query()
                ->where($usernameAttribute, '=', $username)
                ->first();

            if (! $ldapUser) {
                return null;
            }

            $connection = Container::getConnection(config('ldap.default', 'default'));

            if (! $connection->auth()->attempt($ldapUser->getDn(), $password)) {
                return null;
            }

            return $this->mapearUsuario($ldapUser);
        } catch (Throwable $e) {
            // Nunca registrar la contraseña ni credenciales de enlace.
            Log::error('Error de autenticación contra Active Directory.', [
                'username' => $username,
                'mensaje' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Convierte el modelo LDAP en el DTO normalizado del SIGO.
     */
    private function mapearUsuario(LdapUser $ldapUser): DirectoryUser
    {
        return new DirectoryUser(
            guid: (string) $ldapUser->getConvertedGuid(),
            username: (string) ($ldapUser->getFirstAttribute(
                config('sigo.active_directory.username_attribute', 'samaccountname')
            ) ?? ''),
            nombres: $this->valor($ldapUser, 'givenname') ?? $this->valor($ldapUser, 'displayname'),
            apellidos: $this->valor($ldapUser, 'sn'),
            correo: $this->valor($ldapUser, 'mail') ?? $this->valor($ldapUser, 'userprincipalname'),
            grupos: $this->obtenerGrupos($ldapUser),
        );
    }

    private function valor(LdapUser $ldapUser, string $atributo): ?string
    {
        $valor = $ldapUser->getFirstAttribute($atributo);

        return is_string($valor) && trim($valor) !== '' ? $valor : null;
    }

    /**
     * Obtiene los nombres (CN) de todos los grupos del usuario, incluyendo
     * los anidados cuando el directorio lo permite. Si la consulta recursiva
     * falla, recurre al atributo memberOf (membresía directa).
     *
     * @return list<string>
     */
    private function obtenerGrupos(LdapUser $ldapUser): array
    {
        try {
            $grupos = $ldapUser->groups()->recursive()->get();

            $nombres = [];
            foreach ($grupos as $grupo) {
                $cn = $grupo->getFirstAttribute('cn') ?? $grupo->getName();
                if (! empty($cn)) {
                    $nombres[] = $cn;
                }
            }

            Log::info('[AD-DEBUG] Grupos obtenidos vía groups()->recursive()', [
                'usuario' => $ldapUser->getFirstAttribute('samaccountname'),
                'grupos' => $nombres,
            ]);

            if (! empty($nombres)) {
                return array_values(array_unique($nombres));
            }
        } catch (Throwable $e) {
            Log::warning('No se pudieron resolver los grupos LDAP de forma recursiva; se usará memberOf.', [
                'mensaje' => $e->getMessage(),
            ]);
        }

        $porMemberOf = $this->gruposDesdeMemberOf($ldapUser);

        Log::info('[AD-DEBUG] Grupos obtenidos vía memberOf (fallback)', [
            'usuario' => $ldapUser->getFirstAttribute('samaccountname'),
            'grupos' => $porMemberOf,
            'memberof_raw' => $ldapUser->getAttribute('memberof'),
        ]);

        return $porMemberOf;
    }

    /**
     * Extrae los CN de los grupos a partir del atributo memberOf.
     *
     * @return list<string>
     */
    private function gruposDesdeMemberOf(LdapUser $ldapUser): array
    {
        $memberOf = $ldapUser->getAttribute('memberof') ?? [];
        $nombres = [];

        foreach ((array) $memberOf as $dn) {
            if (preg_match('/CN=([^,]+)/i', (string) $dn, $coincidencias)) {
                $nombres[] = $coincidencias[1];
            }
        }

        return array_values(array_unique($nombres));
    }
}
