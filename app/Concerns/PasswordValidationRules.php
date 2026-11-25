<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Get the validation rules used to validate passwords.
     *
     * @return array<int, Rule|array<mixed>|string>
     */
    protected function passwordRules(): array
    {
        return ['required', 'string', Password::default(), 'confirmed'];
    }

    /**
     * Mensajes en español para passwordRules() sobre el campo indicado.
     *
     * La regla Password reporta sus fallas como "password.mixed",
     * "password.numbers", etc., por eso la clave es "<campo>.password.<x>"
     * y no "<campo>.<x>". Los requisitos deben coincidir con
     * Password::defaults() en AppServiceProvider.
     *
     * @return array<string, string>
     */
    protected function passwordMessages(string $campo): array
    {
        $requisitos = 'La contraseña debe tener entre 8 y 12 caracteres e incluir al menos una letra mayúscula, una letra minúscula y un número.';

        return [
            "{$campo}.required"               => 'La contraseña es obligatoria.',
            "{$campo}.min"                    => $requisitos,
            "{$campo}.max"                    => $requisitos,
            "{$campo}.password.mixed"         => $requisitos,
            "{$campo}.password.letters"       => $requisitos,
            "{$campo}.password.numbers"       => $requisitos,
            "{$campo}.password.uncompromised" => 'Esta contraseña es muy común o ha aparecido en filtraciones de datos públicas. Por favor elige una contraseña diferente.',
            "{$campo}.confirmed"              => 'La confirmación de contraseña no coincide.',
        ];
    }

    /**
     * Get the validation rules used to validate the current password.
     *
     * @return array<int, Rule|array<mixed>|string>
     */
    protected function currentPasswordRules(): array
    {
        return ['required', 'string', 'current_password'];
    }
}
