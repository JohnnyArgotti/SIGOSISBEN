<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Los usuarios autenticados contra Active Directory no pueden editar su
     * perfil desde el SIGO: sus nombres, apellidos y correo se sincronizan
     * desde el directorio en cada inicio de sesión (LoginService), por lo que
     * cualquier cambio guardado aquí se perdería en el siguiente login.
     * AD es la única fuente de verdad de esos datos.
     */
    public function authorize(): bool
    {
        return ! $this->user()->autenticacion_ad;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Nombres y apellidos no son editables desde aquí: son datos que no
     * cambian y se gestionan desde Gestión de usuarios.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'correo'    => $this->correoRules($userId),
            'telefono'  => $this->telefonoRules(),
        ];
    }
}
