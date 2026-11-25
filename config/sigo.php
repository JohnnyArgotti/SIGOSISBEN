<?php

/*
|--------------------------------------------------------------------------
| Configuración propia del SIGO
|--------------------------------------------------------------------------
|
| Parámetros de negocio del SIGO relacionados con la integración de
| autenticación híbrida (Local + Active Directory). La autorización
| continúa administrándose exclusivamente mediante Spatie Permission.
|
*/

return [

    /*
    |----------------------------------------------------------------------
    | Proxies de confianza
    |----------------------------------------------------------------------
    |
    | Orígenes desde los que se acepta la cabecera X-Forwarded-For.
    |
    | Sin esto, detrás de un proxy inverso (IIS, Apache, nginx, balanceador)
    | request()->ip() devuelve la IP del PROXY en todas las peticiones: la
    | auditoría registraría un origen falso y el límite de inicio de sesión
    | por IP trataría a toda la institución como un único origen.
    |
    | El valor por defecto —bucle local y rangos privados— es correcto en las
    | dos topologías posibles: si hay proxy, está en esa red y su cabecera se
    | respeta; si no lo hay, un cliente de Internet no puede falsear su IP,
    | porque su origen nunca cae dentro de la lista. Solo hay que ampliarlo si
    | el proxy tiene una IP pública.
    |
    | Se aplica en AppServiceProvider, no en bootstrap/app.php: el closure de
    | withMiddleware() corre antes de que exista la configuración.
    |
    */
    'trusted_proxies' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'TRUSTED_PROXIES',
            '127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16',
        )),
    ))),

    'active_directory' => [

        // Habilita/deshabilita globalmente la autenticación contra AD.
        // Si está deshabilitada, solo opera la autenticación local.
        'enabled' => filter_var(env('AD_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

        // Atributo LDAP usado como nombre de usuario de inicio de sesión.
        'username_attribute' => env('AD_USERNAME_ATTRIBUTE', 'samaccountname'),

        // Grupo de Active Directory cuyos miembros serán considerados
        // administradores globales del SIGO. Única fuente de verdad para
        // el rol de administrador. Nunca se hardcodea en el código.
        'admin_group' => env('AD_ADMIN_GROUP'),

        // Rol del SIGO (Spatie Permission) que se asigna/remueve según la
        // pertenencia al grupo administrador de AD. Se reutiliza el rol
        // de máximo privilegio ya existente en el sistema para no crear
        // lógica RBAC paralela.
        'admin_role' => env('AD_ADMIN_ROLE', 'Administrador'),
    ],

    /*
    |----------------------------------------------------------------------
    | Protección del inicio de sesión
    |----------------------------------------------------------------------
    |
    | Dos mecanismos independientes y complementarios:
    |
    | 1. Contador por CUENTA (solo autenticación local): tras N intentos
    |    fallidos la cuenta se desactiva. El contador caduca solo si pasa
    |    la ventana configurada sin nuevos intentos fallidos.
    |
    | 2. Rate limit por IP + usuario: protege contra fuerza bruta
    |    distribuida sobre cualquier nombre de usuario (exista o no), con
    |    bloqueos temporales de duración escalonada ante la reincidencia.
    |
    | 3. Rate limit por IP: protege contra el barrido de muchos nombres de
    |    usuario distintos desde un mismo origen. El mecanismo 2 no lo
    |    detecta, porque cada nombre de usuario estrena su propio contador.
    |
    */
    'login' => [

        // Intentos fallidos consecutivos antes de desactivar la cuenta.
        'max_intentos' => (int) env('LOGIN_MAX_INTENTOS', 5),

        // Minutos sin intentos fallidos tras los cuales el contador de la
        // cuenta vuelve a cero por sí solo.
        'minutos_reinicio_intentos' => (int) env('LOGIN_MINUTOS_REINICIO', 30),

        'rate_limit' => [

            // Intentos fallidos permitidos dentro de la ventana antes de
            // aplicar un bloqueo temporal a la combinación IP + usuario.
            'max_intentos' => (int) env('LOGIN_RATE_LIMIT_INTENTOS', 3),

            // Duración de la ventana de conteo, en segundos. Deliberadamente
            // corta: el objetivo es distinguir a un bot de una persona, no
            // castigar a quien se equivoca varias veces seguidas. Tres envíos
            // en cinco segundos no son alcanzables tecleando; con una ventana
            // de un minuto sí lo serían, y un usuario legítimo terminaría
            // esperando 15 minutos por escribir mal su contraseña.
            'ventana_segundos' => (int) env('LOGIN_RATE_LIMIT_VENTANA', 5),

            // Segunda ventana sobre la MISMA llave IP + usuario, esta vez
            // larga. Cierra el ataque lento contra una sola cuenta: quien
            // espacia los intentos para no llenar la ventana de cinco segundos
            // encuentra aquí su techo.
            //
            // Importa sobre todo para las cuentas de directorio activo y los
            // nombres inexistentes, que no tienen contador de cuenta —ese solo
            // existe para los usuarios locales— y sin esto no tendrían ningún
            // límite frente a un ataque paciente.
            //
            // Deliberadamente se usan los MISMOS valores que el contador de la
            // cuenta local ('max_intentos' y 'minutos_reinicio_intentos'), y se
            // aplica a los tres tipos de usuario por igual. Así el bloqueo
            // temporal cae en el mismo intento en que una cuenta local quedaría
            // desactivada, y los tres tipos responden de forma idéntica ante
            // una misma secuencia de fallos. Cualquier desajuste entre estos
            // números y los de la cuenta reabriría el oráculo de enumeración,
            // porque el intento en que aparece el bloqueo delataría de qué tipo
            // de usuario se trata.
            'sostenido' => [
                'max_intentos' => (int) env('LOGIN_RATE_LIMIT_SOSTENIDO_INTENTOS', 5),
                'ventana_minutos' => (int) env('LOGIN_RATE_LIMIT_SOSTENIDO_VENTANA', 30),
            ],

            // Duración en minutos de cada bloqueo sucesivo. La reincidencia
            // avanza un escalón; al llegar al último, se mantiene allí. La
            // comparten las dos ventanas anteriores: el bloqueo del par
            // IP + usuario es uno solo, se llegue a él por ráfaga o por
            // insistencia sostenida.
            'escalada_minutos' => [15, 30, 60, 360, 1440],

            // Minutos que se recuerda el escalón alcanzado una vez cumplido
            // el bloqueo. Si la IP + usuario no reincide en ese lapso, la
            // escalada vuelve al primer nivel.
            'memoria_escalada_minutos' => (int) env('LOGIN_RATE_LIMIT_MEMORIA', 1440),

            // Límite por IP, sin el nombre de usuario en la clave. Es el
            // único de los tres que ve el patrón "muchos usuarios distintos
            // desde el mismo origen", que es la firma de la enumeración de
            // cuentas. Se aplica por igual a usuarios locales, de directorio
            // activo e inexistentes.
            'por_ip' => [

                // Cantidad de NOMBRES DE USUARIO DISTINTOS que pueden fallar
                // desde una misma IP dentro de la ventana antes de bloquear el
                // origen.
                //
                // Se cuentan nombres distintos y no intentos fallidos porque
                // esa es la métrica que separa a un atacante de una oficina
                // llena de gente: quien olvida su contraseña y reintenta ocho
                // veces suma 1, porque siempre falla contra SU propio usuario;
                // quien enumera cuentas suma 1 por cada nombre que prueba. Así
                // el umbral crece con el número de personas con problemas, no
                // con el número de tropiezos, y varias decenas de usuarios
                // legítimos tras una misma IP (NAT) no lo agotan.
                'max_usuarios' => (int) env('LOGIN_RATE_LIMIT_IP_USUARIOS', 20),

                // Ventana de conteo, en minutos. Larga a propósito: aquí lo
                // que se persigue es el ataque lento, que precisamente evade
                // la ventana de cinco segundos del límite por IP + usuario.
                'ventana_minutos' => (int) env('LOGIN_RATE_LIMIT_IP_VENTANA', 60),

                // Duración en minutos de cada bloqueo sucesivo del origen.
                'escalada_minutos' => [15, 60, 360, 1440],

                // Minutos que se recuerda el escalón alcanzado por la IP una
                // vez cumplido el bloqueo.
                'memoria_escalada_minutos' => (int) env('LOGIN_RATE_LIMIT_IP_MEMORIA', 1440),

                // IPs o rangos CIDR exentos del límite por IP, separados por
                // comas. Válvula de escape para el caso en que la institución
                // salga a Internet por una sola IP pública (NAT) y aun así,
                // pese a contar nombres distintos, el umbral resulte estrecho.
                // El límite por IP + usuario NO se ve afectado por esta lista:
                // cada cuenta sigue protegida una por una.
                // Ejemplo: LOGIN_RATE_LIMIT_IP_EXENTAS="10.0.0.0/8,190.0.2.5"
                'exentas' => array_values(array_filter(array_map(
                    'trim',
                    explode(',', (string) env('LOGIN_RATE_LIMIT_IP_EXENTAS', '')),
                ))),
            ],
        ],
    ],

];
