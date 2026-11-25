<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PasswordUpdateRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Los usuarios de Active Directory no poseen contraseña local (la columna
     * `contrasena` es nula para ellos): su credencial vive únicamente en el
     * directorio y debe cambiarse por los medios institucionales.
     */
    public function authorize(): bool
    {
        return ! $this->user()->autenticacion_ad;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            'password' => $this->passwordRules(),
        ];
    }

    /**
     * Get custom validation messages in Spanish.
     */
    public function messages(): array
    {
        return [
            ...$this->passwordMessages('password'),
            'current_password.required'     => 'La contraseña actual es obligatoria.',
            'current_password.current_password' => 'La contraseña actual no es correcta.',
            'password.required'             => 'La nueva contraseña es obligatoria.',
        ];
    }
}
