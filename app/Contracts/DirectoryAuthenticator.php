<?php

namespace App\Contracts;

use App\Services\Ldap\DirectoryUser;

/**
 * Contrato del proveedor de autenticación de directorio.
 *
 * Permite reemplazar el proveedor (Active Directory, OpenLDAP, IdP futuro)
 * sin modificar la lógica del SIGO. Toda la implementación específica del
 * protocolo debe quedar encapsulada detrás de esta interfaz.
 */
interface DirectoryAuthenticator
{
    /**
     * Indica si la autenticación contra el directorio está habilitada y
     * configurada en el entorno.
     */
    public function estaHabilitado(): bool;

    /**
     * Valida las credenciales contra el directorio.
     *
     * Devuelve la identidad institucional (incluyendo grupos) cuando las
     * credenciales son válidas, o null cuando son inválidas, el usuario no
     * existe en el directorio, o el directorio no está disponible.
     *
     * La contraseña jamás debe ser persistida ni registrada.
     */
    public function autenticar(string $username, string $password): ?DirectoryUser;
}
