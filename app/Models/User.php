<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\Auditable;
use Closure;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasFactory, HasRoles, Notifiable {
        HasRoles::hasRole as protected traitHasRole;
        HasRoles::getPermissionsViaRoles as protected traitGetPermissionsViaRoles;
    }

    /**
     * Campos que no deben generar registros de auditoría por ser ruido
     * operativo (intentos de login, bloqueos automáticos).
     *
     * @var list<string>
     */
    protected array $auditExcluir = [
        'intentos_fallidos',
        'ultimo_intento_fallido',
    ];

    protected string $auditEtiqueta = 'Usuario';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'usuario';

    protected $primaryKey = 'id';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The name of the "created at" column.
     *
     * @var string|null
     */
    const CREATED_AT = 'creado_el';

    /**
     * The name of the "updated at" column.
     *
     * @var string|null
     */
    const UPDATED_AT = 'actualizado_el';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tipo_documento_id',
        'nombres',
        'apellidos',
        'nombre_usuario',
        'contrasena',
        'num_documento',
        'telefono',
        'correo',
        'estado',
        'intentos_fallidos',
        'ultimo_intento_fallido',
        'autenticacion_ad',
        'ad_guid',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'contrasena',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'ultimo_intento_fallido' => 'datetime',
            'contrasena' => 'hashed',
            'estado' => 'boolean',
            'autenticacion_ad' => 'boolean',
        ];
    }

    /**
     * Get the password for the user (required by the Auth system).
     *
     * @return string
     */
    public function getAuthPassword()
    {
        return $this->contrasena;
    }

    public function solicitudes()
    {
        return $this->hasMany(Solicitud::class, 'usuario_id');
    }

    public function atenciones()
    {
        return $this->hasMany(Atencion::class, 'usuario_id');
    }

    /**
     * Un usuario sin roles, o cuyos roles asignados están todos inactivos,
     * no tiene ningún permiso funcional: debe tratarse igual que "sin acceso".
     */
    public function tieneAlgunRolActivo(): bool
    {
        return $this->roles()->where('estado', true)->exists();
    }

    /**
     * Un rol inactivo no debe otorgar acceso: se comprueba contra el rol
     * igual que Spatie, pero solo considerando los roles con estado activo.
     * La asignación real en `model_has_roles` no se toca, para no romper
     * assignRole()/syncRoles() ni perder el historial si el rol se reactiva.
     */
    public function hasRole($roles, ?string $guard = null): bool
    {
        return $this->withOnlyActiveRoles(fn () => $this->traitHasRole($roles, $guard));
    }

    /**
     * Los permisos otorgados únicamente por un rol inactivo no deben quedar
     * disponibles (ni al backend ni al frontend, que consume esta lista vía
     * HandleInertiaRequests).
     */
    public function getPermissionsViaRoles(): Collection
    {
        return $this->withOnlyActiveRoles(fn () => $this->traitGetPermissionsViaRoles());
    }

    private function withOnlyActiveRoles(Closure $callback): mixed
    {
        $this->loadMissing('roles');
        $todosLosRoles = $this->getRelation('roles');

        $this->setRelation('roles', $todosLosRoles->where('estado', true)->values());

        try {
            return $callback();
        } finally {
            $this->setRelation('roles', $todosLosRoles);
        }
    }
}
