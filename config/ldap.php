<?php

/*
|--------------------------------------------------------------------------
| Configuración LDAP / Active Directory (LdapRecord)
|--------------------------------------------------------------------------
|
| Toda la configuración se obtiene exclusivamente desde variables de
| entorno. No debe hardcodearse ningún valor de conexión ni nombres de
| grupos dentro del código fuente.
|
*/

return [

    'default' => env('LDAP_CONNECTION', 'default'),

    'connections' => [

        'default' => [
            'hosts' => array_filter(explode(',', (string) env('AD_HOST', ''))),
            'username' => env('AD_BIND_DN', ''),
            'password' => env('AD_BIND_PASSWORD', ''),
            'port' => (int) env('AD_PORT', 389),
            'base_dn' => env('AD_BASE_DN', ''),
            'timeout' => (int) env('AD_TIMEOUT', 5),
            // AD_SSL => conexión cifrada ldaps:// (puerto 636 habitual).
            'use_tls' => filter_var(env('AD_SSL', false), FILTER_VALIDATE_BOOLEAN),
            // AD_TLS => actualización STARTTLS sobre ldap:// (puerto 389).
            'use_starttls' => filter_var(env('AD_TLS', false), FILTER_VALIDATE_BOOLEAN),
            'use_sasl' => false,
            'options' => [],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    |
    | LdapRecord puede registrar las operaciones LDAP. Nunca se registran
    | contraseñas ni credenciales de enlace (bind).
    |
    */

    'logging' => [
        'enabled' => filter_var(env('LDAP_LOGGING', false), FILTER_VALIDATE_BOOLEAN),
        'channel' => env('LOG_CHANNEL', 'stack'),
        'level' => 'info',
    ],

    'cache' => [
        'enabled' => false,
        'driver' => env('CACHE_STORE', 'database'),
    ],

];
