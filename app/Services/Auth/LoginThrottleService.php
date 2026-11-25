<?php

namespace App\Services\Auth;

use App\Services\AuditoriaService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Limita la tasa de intentos de inicio de sesión mediante dos contadores
 * independientes que vigilan patrones de ataque distintos.
 *
 * A diferencia del contador de intentos de la cuenta (que solo existe para
 * usuarios locales y termina desactivándola), estos mecanismos actúan ANTES de
 * consultar la base de datos y se aplican por igual a nombres de usuario que
 * existen y a los que no. Esa uniformidad es deliberada: si solo se limitaran
 * los usuarios reales, el propio bloqueo delataría cuáles existen.
 *
 * 1. Por IP + USUARIO, con dos ventanas sobre la misma llave:
 *
 *    - Muy corta (3 fallos en 5 segundos). Lo que se busca detectar aquí es la
 *      automatización, no la torpeza: una persona que se equivoca tres veces
 *      seguidas tarda bastante más que eso en enviar el formulario, así que
 *      nunca llega a bloquearse; un bot que dispara peticiones sí.
 *
 *    - Larga (5 fallos en 30 minutos). Cierra el hueco de la anterior: quien
 *      espacia los intentos deliberadamente para no llenar los cinco segundos
 *      encuentra aquí su techo. Es lo único que limita un ataque paciente
 *      contra una cuenta de directorio activo, que no tiene contador de cuenta.
 *      Sus valores replican los del contador de la cuenta local a propósito,
 *      para que el bloqueo aparezca en el mismo intento sea cual sea el tipo
 *      de usuario y la respuesta no delate de cuál se trata.
 *
 * 2. Por IP SOLA, con ventana larga (1 hora), contando NOMBRES DE USUARIO
 *    DISTINTOS. Cubre el punto ciego del anterior: como allí el nombre de
 *    usuario forma parte de la clave, quien prueba un usuario distinto en cada
 *    intento estrena un contador limpio cada vez y nunca se bloquea, por
 *    rápido que vaya. Ese barrido de nombres es justamente la firma de la
 *    enumeración de cuentas, y solo se ve agregando por origen. Alcanza a
 *    usuarios locales, de directorio activo e inexistentes, porque cuenta
 *    antes de saber de cuál se trata.
 *
 *    Que cuente nombres distintos y no intentos es lo que lo hace compatible
 *    con una institución donde mucha gente comparte la IP de salida: un
 *    usuario legítimo solo falla contra SU propio nombre, así que reintentar
 *    no lo acerca al umbral, y el contador mide cuánta gente distinta tiene
 *    problemas —no cuántas veces se equivoca cada quien. Un atacante, que por
 *    definición prueba nombres ajenos, suma uno por cada nombre.
 *
 * Superar cualquiera de los dos límites aplica un bloqueo temporal. La
 * reincidencia avanza un escalón en la escalada configurada y el escalón
 * alcanzado se recuerda un tiempo después de cumplido el bloqueo: quien
 * insiste espera cada vez más, y quien deja de insistir vuelve al primer
 * nivel. Ambos bloqueos producen el mismo mensaje, de modo que la respuesta
 * tampoco revela cuál de los dos se activó.
 */
class LoginThrottleService
{
    private const PREFIJO_INTENTOS = 'login:intentos:';

    private const PREFIJO_SOSTENIDO = 'login:sostenido:';

    private const PREFIJO_BLOQUEO = 'login:bloqueo:';

    private const PREFIJO_NIVEL = 'login:nivel:';

    private const PREFIJO_IP_INTENTOS = 'login:ip:intentos:';

    private const PREFIJO_IP_BLOQUEO = 'login:ip:bloqueo:';

    private const PREFIJO_IP_NIVEL = 'login:ip:nivel:';

    private const PREFIJO_IP_VISTOS = 'login:ip:vistos:';

    public function __construct(
        private readonly AuditoriaService $auditoria,
    ) {}

    /**
     * Corta el flujo si hay un bloqueo vigente, sea del origen completo o de
     * la combinación IP + usuario.
     *
     * @throws ValidationException
     */
    public function asegurarNoBloqueado(string $username, string $ip): void
    {
        $this->asegurarClaveLibre(self::PREFIJO_IP_BLOQUEO.$this->huellaIp($ip));
        $this->asegurarClaveLibre(self::PREFIJO_BLOQUEO.$this->huella($username, $ip));
    }

    /**
     * Contabiliza un intento fallido de credenciales en todos los contadores.
     *
     * Si con este intento se agota el cupo de alguno, aplica su bloqueo y
     * lanza el mensaje correspondiente, que sustituye al de credenciales
     * inválidas para informar al usuario legítimo de cuánto debe esperar.
     *
     * @throws ValidationException
     */
    public function registrarFallo(string $username, string $ip): void
    {
        // Todos los contadores avanzan siempre, aunque alguno ya haya
        // disparado su bloqueo: cada uno vigila un patrón distinto y ninguno
        // debe dejar de contar por lo que ocurra en los otros.
        $porUsuario = $this->contabilizarPorUsuario($username, $ip);
        $porIp = $this->contabilizarPorIp($username, $ip);

        // Si varios se activaron a la vez, manda la espera más larga.
        $segundos = max($porUsuario, $porIp);

        if ($segundos > 0) {
            throw $this->excepcionDeBloqueo($segundos);
        }
    }

    /**
     * Un inicio de sesión exitoso limpia por completo el historial de la
     * combinación IP + usuario, incluido el escalón de la escalada.
     *
     * El contador del ORIGEN no se limpia a propósito: si bastara con
     * autenticarse bien una vez para ponerlo a cero, quien poseyera una sola
     * credencial válida podría reiniciarlo a voluntad entre tandas y barrer
     * nombres de usuario indefinidamente. Ese contador solo cede con el
     * tiempo.
     */
    public function limpiar(string $username, string $ip): void
    {
        $huella = $this->huella($username, $ip);

        RateLimiter::clear(self::PREFIJO_INTENTOS.$huella);
        RateLimiter::clear(self::PREFIJO_SOSTENIDO.$huella);
        RateLimiter::clear(self::PREFIJO_BLOQUEO.$huella);
        Cache::forget(self::PREFIJO_NIVEL.$huella);
    }

    /**
     * @throws ValidationException
     */
    private function asegurarClaveLibre(string $clave): void
    {
        if (RateLimiter::tooManyAttempts($clave, 1)) {
            throw $this->excepcionDeBloqueo(RateLimiter::availableIn($clave));
        }
    }

    /**
     * Contadores de fuerza bruta sobre una cuenta concreta.
     *
     * Son dos ventanas sobre la misma llave IP + usuario, porque hay dos
     * formas distintas de atacar una sola cuenta:
     *
     * - RÁFAGA (3 en 5 segundos): la automatización evidente.
     * - SOSTENIDA (5 en 30 minutos): el ataque lento, que espacia los intentos
     *   justamente para no llenar la ventana corta. Sin esta segunda ventana,
     *   quien probara una contraseña cada diez segundos contra la misma cuenta
     *   no encontraría techo alguno; el contador de la cuenta no sirve aquí,
     *   porque solo existe para usuarios locales y las cuentas de directorio
     *   activo quedarían sin ningún límite.
     *
     * Comparten bloqueo y escalón: son dos maneras de detectar el mismo abuso
     * sobre el mismo par, así que el castigo es uno solo y la reincidencia
     * escala de forma conjunta.
     *
     * @return int Segundos de bloqueo aplicados, o 0 si aún hay cupo.
     */
    private function contabilizarPorUsuario(string $username, string $ip): int
    {
        $config = $this->config();
        $huella = $this->huella($username, $ip);

        $rafaga = RateLimiter::hit(self::PREFIJO_INTENTOS.$huella, $config['ventana_segundos'])
            >= $config['max_intentos'];

        $sostenido = RateLimiter::hit(self::PREFIJO_SOSTENIDO.$huella, $config['sostenido_ventana_minutos'] * 60)
            >= $config['sostenido_max_intentos'];

        if (! $rafaga && ! $sostenido) {
            return 0;
        }

        $bloqueo = $this->escalarBloqueo(
            $huella,
            self::PREFIJO_INTENTOS,
            self::PREFIJO_BLOQUEO,
            self::PREFIJO_NIVEL,
            $config['escalada_minutos'],
            $config['memoria_escalada_minutos'],
        );

        // El contador de la ventana larga también se reinicia: el par ya está
        // castigado y su historial no debe arrastrarse al salir del bloqueo.
        RateLimiter::clear(self::PREFIJO_SOSTENIDO.$huella);

        $motivo = $rafaga
            ? "{$config['max_intentos']} intentos fallidos en {$config['ventana_segundos']} segundos"
            : "{$config['sostenido_max_intentos']} intentos fallidos en {$config['sostenido_ventana_minutos']} minutos";

        $this->auditoria->registrar(
            evento: 'login_bloqueado_rate_limit',
            descripcion: "[rate_limit] Bloqueo nivel {$bloqueo['nivel']} de ".count($config['escalada_minutos'])
                .' ('.$this->describirDuracion($bloqueo['segundos']).") tras {$motivo}"
                ." desde la IP {$ip} para el usuario: {$username}",
        );

        return $bloqueo['segundos'];
    }

    /**
     * Contador de enumeración de cuentas: agrega por origen, sin el nombre de
     * usuario en la clave, para ver el barrido de muchos nombres distintos.
     *
     * Cuenta NOMBRES DE USUARIO DISTINTOS, no intentos: los reintentos de una
     * misma persona sobre su propia cuenta no acercan el bloqueo. Es lo que
     * hace que el contador tolere a decenas de usuarios legítimos compartiendo
     * una misma IP de salida y siga detectando al que prueba nombres ajenos.
     *
     * @return int Segundos de bloqueo aplicados, o 0 si aún hay cupo, la IP
     *             está exenta o el modo observación está activo.
     */
    private function contabilizarPorIp(string $username, string $ip): int
    {
        $config = $this->configIp();

        if ($config['exentas'] !== [] && IpUtils::checkIp($ip, $config['exentas'])) {
            return 0;
        }

        $huella = $this->huellaIp($ip);
        $ventanaSegundos = $config['ventana_minutos'] * 60;

        // Cache::add solo tiene éxito la primera vez que este nombre de usuario
        // falla desde esta IP dentro de la ventana. Los reintentos posteriores
        // salen por aquí sin tocar el contador.
        $esNombreNuevo = Cache::add(
            self::PREFIJO_IP_VISTOS.$huella.':'.$this->huellaUsuario($username),
            true,
            $ventanaSegundos,
        );

        if (! $esNombreNuevo) {
            return 0;
        }

        $distintos = RateLimiter::hit(self::PREFIJO_IP_INTENTOS.$huella, $ventanaSegundos);

        if ($distintos < $config['max_usuarios']) {
            return 0;
        }

        $bloqueo = $this->escalarBloqueo(
            $huella,
            self::PREFIJO_IP_INTENTOS,
            self::PREFIJO_IP_BLOQUEO,
            self::PREFIJO_IP_NIVEL,
            $config['escalada_minutos'],
            $config['memoria_escalada_minutos'],
        );

        $this->auditoria->registrar(
            evento: 'login_bloqueado_rate_limit_ip',
            descripcion: "[rate_limit_ip] Bloqueo nivel {$bloqueo['nivel']} de ".count($config['escalada_minutos'])
                .' ('.$this->describirDuracion($bloqueo['segundos']).') del origen tras '
                ."{$distintos} nombres de usuario distintos fallidos desde la IP {$ip} en "
                ."{$config['ventana_minutos']} minutos. Último nombre probado: {$username}",
        );

        return $bloqueo['segundos'];
    }

    /**
     * Aplica el siguiente escalón de bloqueo sobre una huella y devuelve su
     * duración en segundos junto con el nivel alcanzado.
     *
     * @param  list<int>  $escalada
     * @return array{segundos: int, nivel: int}
     */
    private function escalarBloqueo(
        string $huella,
        string $prefijoIntentos,
        string $prefijoBloqueo,
        string $prefijoNivel,
        array $escalada,
        int $memoriaMinutos,
    ): array {
        $nivel = min((int) Cache::get($prefijoNivel.$huella, 0) + 1, count($escalada));
        $segundos = $escalada[$nivel - 1] * 60;

        // El escalón sobrevive al propio bloqueo para detectar la reincidencia;
        // si no hay nuevos bloqueos en ese lapso, caduca y se vuelve al nivel 1.
        Cache::put($prefijoNivel.$huella, $nivel, $segundos + $memoriaMinutos * 60);

        RateLimiter::clear($prefijoIntentos.$huella);
        RateLimiter::hit($prefijoBloqueo.$huella, $segundos);

        return ['segundos' => $segundos, 'nivel' => $nivel];
    }

    private function excepcionDeBloqueo(int $segundosRestantes): ValidationException
    {
        $espera = $this->describirDuracion($segundosRestantes);

        return ValidationException::withMessages([
            'nombre_usuario' => 'Se han realizado demasiados intentos de inicio de sesión. '
                ."Por seguridad, espere {$espera} antes de volver a intentarlo.",
        ]);
    }

    /**
     * Expresa una espera en la unidad más legible, redondeando hacia arriba
     * para no prometer al usuario un tiempo menor al real.
     */
    private function describirDuracion(int $segundos): string
    {
        if ($segundos < 60) {
            return 'unos segundos';
        }

        $minutos = (int) ceil($segundos / 60);

        if ($minutos < 60) {
            return $minutos.' '.($minutos === 1 ? 'minuto' : 'minutos');
        }

        $horas = (int) ceil($minutos / 60);

        return $horas.' '.($horas === 1 ? 'hora' : 'horas');
    }

    /**
     * Identifica la combinación IP + usuario sin almacenar el nombre de
     * usuario en claro en la caché, y con una longitud acotada.
     */
    private function huella(string $username, string $ip): string
    {
        return sha1(Str::lower(trim($username)).'|'.$ip);
    }

    /**
     * Identifica al origen por sí solo, sin el nombre de usuario, para que
     * probar nombres distintos no estrene un contador limpio cada vez.
     */
    private function huellaIp(string $ip): string
    {
        return sha1($ip);
    }

    /**
     * Identifica un nombre de usuario dentro del contador de una IP, sin
     * guardarlo en claro en la caché.
     */
    private function huellaUsuario(string $username): string
    {
        return sha1(Str::lower(trim($username)));
    }

    /**
     * @return array{max_intentos: int, ventana_segundos: int, sostenido_max_intentos: int, sostenido_ventana_minutos: int, escalada_minutos: list<int>, memoria_escalada_minutos: int}
     */
    private function config(): array
    {
        return [
            'max_intentos' => max(1, (int) config('sigo.login.rate_limit.max_intentos', 3)),
            'ventana_segundos' => max(1, (int) config('sigo.login.rate_limit.ventana_segundos', 5)),
            'sostenido_max_intentos' => max(1, (int) config('sigo.login.rate_limit.sostenido.max_intentos', 5)),
            'sostenido_ventana_minutos' => max(1, (int) config('sigo.login.rate_limit.sostenido.ventana_minutos', 30)),
            'escalada_minutos' => $this->escalada('sigo.login.rate_limit.escalada_minutos', [15, 30, 60, 360, 1440]),
            'memoria_escalada_minutos' => max(0, (int) config('sigo.login.rate_limit.memoria_escalada_minutos', 1440)),
        ];
    }

    /**
     * @return array{max_usuarios: int, ventana_minutos: int, escalada_minutos: list<int>, memoria_escalada_minutos: int, exentas: list<string>}
     */
    private function configIp(): array
    {
        $exentas = array_values(array_filter(array_map(
            'strval',
            (array) config('sigo.login.rate_limit.por_ip.exentas', []),
        )));

        return [
            'max_usuarios' => max(1, (int) config('sigo.login.rate_limit.por_ip.max_usuarios', 20)),
            'ventana_minutos' => max(1, (int) config('sigo.login.rate_limit.por_ip.ventana_minutos', 60)),
            'escalada_minutos' => $this->escalada('sigo.login.rate_limit.por_ip.escalada_minutos', [15, 60, 360, 1440]),
            'memoria_escalada_minutos' => max(0, (int) config('sigo.login.rate_limit.por_ip.memoria_escalada_minutos', 1440)),
            'exentas' => $exentas,
        ];
    }

    /**
     * Normaliza una escalada configurada, descartando valores no positivos.
     * Nunca devuelve una lista vacía: sin escalones no habría bloqueo alguno.
     *
     * @param  list<int>  $porDefecto
     * @return list<int>
     */
    private function escalada(string $clave, array $porDefecto): array
    {
        $escalada = array_values(array_filter(
            array_map('intval', (array) config($clave, $porDefecto)),
            static fn (int $minutos): bool => $minutos > 0,
        ));

        return $escalada !== [] ? $escalada : [15];
    }
}
