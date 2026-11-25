<?php

namespace App\Services\Ldap;

/**
 * Objeto de valor (DTO) inmutable que representa la identidad institucional
 * de un usuario tal como la entrega el proveedor de directorio (Active
 * Directory u otro en el futuro).
 *
 * Este objeto desacopla por completo al resto del SIGO de la librería LDAP:
 * ninguna capa fuera del servicio de directorio conoce atributos LDAP
 * crudos, sino únicamente esta representación normalizada.
 */
final class DirectoryUser
{
    /**
     * @param  list<string>  $grupos  Nombres (CN) de los grupos de AD a los que pertenece el usuario.
     */
    public function __construct(
        public readonly string $guid,
        public readonly string $username,
        public readonly ?string $nombres,
        public readonly ?string $apellidos,
        public readonly ?string $correo,
        public readonly array $grupos = [],
    ) {}

    /**
     * Indica si el usuario pertenece al grupo de directorio indicado.
     * La comparación es insensible a mayúsculas/minúsculas y a espacios.
     */
    public function perteneceAlGrupo(?string $grupo): bool
    {
        if (empty($grupo)) {
            return false;
        }

        $objetivo = mb_strtolower(trim($grupo));

        foreach ($this->grupos as $g) {
            if (mb_strtolower(trim($g)) === $objetivo) {
                return true;
            }
        }

        return false;
    }
}
