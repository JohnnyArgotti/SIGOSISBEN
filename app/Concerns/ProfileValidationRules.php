<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'nombres' => $this->nombresRules(),
            'apellidos' => $this->apellidosRules(),
            'nombre_usuario' => $this->nombreUsuarioRules($userId),
            'correo' => $this->correoRules($userId),
            'num_documento' => $this->numDocumentoRules($userId),
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
        ];
    }

    /**
     * Get the validation rules used to validate user nombres.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nombresRules(): array
    {
        return ['required', 'string', 'max:100'];
    }

    /**
     * Get the validation rules used to validate user apellidos.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function apellidosRules(): array
    {
        return ['required', 'string', 'max:100'];
    }

    /**
     * Get the validation rules used to validate user nombre_usuario.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nombreUsuarioRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'max:50',
            $userId === null
                ? Rule::unique(User::class, 'nombre_usuario')
                : Rule::unique(User::class, 'nombre_usuario')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user correos.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function correoRules(?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'email',
            'max:150',
            $userId === null
                ? Rule::unique(User::class, 'correo')
                : Rule::unique(User::class, 'correo')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user telefono.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function telefonoRules(): array
    {
        return ['nullable', 'string', 'max:20'];
    }

    /**
     * Get the validation rules used to validate user num_documento.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function numDocumentoRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'max:20',
            $userId === null
                ? Rule::unique(User::class, 'num_documento')
                : Rule::unique(User::class, 'num_documento')->ignore($userId),
        ];
    }
}
