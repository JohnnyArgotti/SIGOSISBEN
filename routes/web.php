<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\GestionsolicitudController;
use App\Http\Controllers\PuntoController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\GestioncampoController;
use App\Http\Controllers\GestioneventoController;
use App\Http\Controllers\GestionencuestadorController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\GestioncalidadController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AcercaDeController;
use App\Http\Controllers\GestionpuntoController;
use App\Http\Controllers\GestiondocumentopublicoController;
use App\Http\Controllers\GestionauditoriaController;
use App\Http\Controllers\GestionreportesController;
use Inertia\Inertia;
use App\Models\Solicitud;


Route::get('/', function () {
    // Sin cuerpo: la página HTML que Symfony adjunta por defecto a cada
    // redirección no la usa ningún navegador, y un 302 con cuerpo se reporta
    // como posible fuga de información en el escaneo de seguridad.
    return redirect('/login')->setContent('');
});

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.store');

Route::get('/forgot-password', fn() => Inertia::render('auth/forgot-password'))->name('password.request');


Route::post('/guardar-punto', [PuntoController::class, 'guardarSeleccion'])
    ->middleware('auth')
    ->name('guardar.punto');

Route::get('/home', function () {
    $user = Auth::user();
    $ruta = app(\App\Http\Controllers\Auth\AuthController::class)->getHomeRoute($user);
    return redirect($ruta ?? '/');
})->middleware('auth')->name('home');


Route::middleware(['auth', 'punto', 'inactividad'])->group(function () {

    // Endpoint liviano para que el frontend renueve session('last_activity_time')
    Route::post('/keep-alive', fn() => response()->noContent())->name('keep-alive');


    // Autocompletado del ciudadano en el formulario de registro. Exige el
    // mismo permiso que ese formulario: quien no puede registrar tampoco
    // puede consultar los datos de un ciudadano por su documento.
    Route::get('api/ciudadano/buscar', [GestionsolicitudController::class, 'buscarCiudadano'])
        ->name('ciudadano.buscar')
        ->middleware('permission:Crear solicitudes|Crear atenciones');

    // Registrar exige los permisos de creación, no los de consulta. Va antes
    // del grupo de consulta para que /gestion_solicitudes/create no lo capture
    // la ruta de detalle.
    Route::resource('gestion_solicitudes', GestionsolicitudController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear solicitudes|Crear atenciones');

    // parameters() fija el nombre del parámetro en singular. Es obligatorio:
    // Laravel lo deriva singularizando en inglés y de 'gestion_solicitudes'
    // saca 'gestion_solicitude', que no coincide con el where() de abajo ni
    // con lo que esperan los controladores. Misma razón en el resto de los
    // resource de este archivo.
    //
    // El identificador se restringe a dígitos: sin esto, la ruta de detalle
    // captura cualquier segmento literal registrado más abajo —como
    // /gestion_solicitudes/ids-registradas— y lo intenta resolver como un id.
    Route::resource('gestion_solicitudes', GestionsolicitudController::class)
        ->only(['index', 'show'])
        ->parameters(['gestion_solicitudes' => 'gestion_solicitud'])
        ->middleware('permission:Ver solicitudes|Ver atenciones')
        ->where(['gestion_solicitud' => '[0-9]+']);

    Route::patch('gestion_solicitudes/{id}/enviar-campo', [GestionsolicitudController::class, 'enviarACampo'])
        ->name('gestion_solicitudes.enviar_campo')
        ->middleware('permission:Enviar solicitudes a campo');

    Route::patch('gestion_solicitudes/{id}/cancelar', [GestionsolicitudController::class, 'cancelar'])
        ->name('gestion_solicitudes.cancelar')
        ->middleware('permission:Cancelar solicitudes');

    Route::post('gestion_solicitudes/enviar-campo-masivo', [GestionsolicitudController::class, 'enviarACampoMasivo'])
        ->name('gestion_solicitudes.enviar_campo_masivo')
        ->middleware('permission:Enviar solicitudes a campo');

    Route::get('gestion_solicitudes/ids-registradas', [GestionsolicitudController::class, 'idsRegistradas'])
        ->name('gestion_solicitudes.ids_registradas')
        ->middleware('permission:Enviar solicitudes a campo');

    Route::get('gestion_atenciones/{id}', [GestionsolicitudController::class, 'showAtencion'])
        ->name('gestion_atenciones.show')
        ->middleware('permission:Ver atenciones');

    Route::get('gestion_atenciones/{id}/edit', [GestionsolicitudController::class, 'editAtencion'])
        ->name('gestion_atenciones.edit')
        ->middleware('permission:Editar atenciones');

    Route::put('gestion_atenciones/{id}', [GestionsolicitudController::class, 'updateAtencion'])
        ->name('gestion_atenciones.update')
        ->middleware('permission:Editar atenciones');

    // Estas rutas solo editan solicitudes; las atenciones tienen las suyas
    // en gestion_atenciones, bajo 'Editar atenciones'.
    Route::resource('gestion_solicitudes', GestionsolicitudController::class)
        ->only(['edit', 'update'])
        ->parameters(['gestion_solicitudes' => 'gestion_solicitud'])
        ->middleware('permission:Editar solicitudes')
        ->where(['gestion_solicitud' => '[0-9]+']);

    Route::get('/gestion_solicitudes/exportar/efectivas', [GestionsolicitudController::class, 'exportarEfectivas'])
        ->name('gestion_solicitudes.exportar.efectivas')
        ->middleware('permission:Ver solicitudes');

    Route::get('/gestion_solicitudes/exportar/no-efectivas', [GestionsolicitudController::class, 'exportarNoEfectivas'])
        ->name('gestion_solicitudes.exportar.noefectivas')
        ->middleware('permission:Ver atenciones');



    Route::resource('gestion_eventos', GestioneventoController::class)
        ->only(['index'])
        ->middleware('permission:Ver eventos');

    Route::get('/gestion_eventos/exportar', [GestioneventoController::class, 'exportarListadoEventos'])
        ->name('gestion_eventos.exportar')
        ->middleware('permission:Ver eventos');

    Route::resource('gestion_eventos', GestioneventoController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear eventos');

    Route::resource('gestion_eventos', GestioneventoController::class)
        ->only(['edit', 'update'])
        ->parameters(['gestion_eventos' => 'gestion_evento'])
        ->middleware('permission:Editar eventos');

    // Activar y cancelar el evento. Es la única vía: el destroy del resource
    // hacía exactamente esto mismo y se retiró por redundante.
    Route::patch('gestion_eventos/{gestion_evento}/toggle', [GestioneventoController::class, 'toggle'])
        ->name('gestion_eventos.toggle')
        ->middleware('permission:Inactivar eventos');

    Route::get('gestion_eventos/{gestion_evento}/exportar/solicitudes', [GestioneventoController::class, 'exportarSolicitudes'])
        ->name('gestion_eventos.exportar.solicitudes')
        ->middleware('permission:Ver eventos');

    Route::get('gestion_eventos/{gestion_evento}/exportar/atenciones', [GestioneventoController::class, 'exportarAtenciones'])
        ->name('gestion_eventos.exportar.atenciones')
        ->middleware('permission:Ver eventos');

    // Registrar exige el permiso de creación, no el de consulta. Va antes del
    // grupo de consulta para que /gestion_usuarios/create no lo capture la
    // ruta de detalle.
    Route::resource('gestion_usuarios', UsuarioController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear usuarios');

    Route::resource('gestion_usuarios', UsuarioController::class)
        ->only(['index', 'show'])
        ->parameters(['gestion_usuarios' => 'gestion_usuario'])
        ->middleware('permission:Ver usuarios')
        ->where(['gestion_usuario' => '[0-9]+']);

    Route::resource('gestion_usuarios', UsuarioController::class)
        ->only(['edit', 'update'])
        ->parameters(['gestion_usuarios' => 'gestion_usuario'])
        ->middleware('permission:Editar usuarios');

    // Asignación de roles (flujo dedicado para usuarios de Active Directory).
    Route::get('gestion_usuarios/{gestion_usuario}/roles', [UsuarioController::class, 'editRoles'])
        ->name('gestion_usuarios.roles.edit')
        ->middleware('permission:Editar usuarios');

    Route::put('gestion_usuarios/{gestion_usuario}/roles', [UsuarioController::class, 'updateRoles'])
        ->name('gestion_usuarios.roles.update')
        ->middleware('permission:Editar usuarios');

    // Activar y desactivar la cuenta. Cambiar el estado de un administrador
    // exige además 'Inactivar administradores', que se comprueba en el
    // controlador porque depende del rol del usuario destino.
    Route::patch('gestion_usuarios/{gestion_usuario}/toggle', [UsuarioController::class, 'toggle'])
        ->name('gestion_usuarios.toggle')
        ->middleware('permission:Inactivar usuarios');

    Route::get('gestion_usuarios/{gestion_usuario}/reset-password', [UsuarioController::class, 'showResetPassword'])
        ->name('gestion_usuarios.reset-password.form')
        ->middleware('permission:Editar usuarios');

    Route::patch('gestion_usuarios/{gestion_usuario}/reset-password', [UsuarioController::class, 'resetPassword'])
        ->name('gestion_usuarios.reset-password')
        ->middleware('permission:Editar usuarios');

    Route::get('/gestion_usuarios/exportar/usuarios', [UsuarioController::class, 'exportar'])
        ->name('gestion_usuarios.exportar')
        ->middleware('permission:Ver usuarios');

    Route::resource('gestion_campo', GestioncampoController::class)
        ->only(['index'])
        ->middleware('permission:Ver solicitudes en campo');

    // whereNumber es obligatorio: sin él este patrón captura también
    // /gestion_campo/solicitudes/reservadas (registrada más abajo) y rompe el
    // polling de reservas del formulario de creación de paquetes.
    Route::get('/gestion_campo/solicitudes/{id}', [GestioncampoController::class, 'showSolicitud'])
        ->whereNumber('id')
        ->middleware('permission:Ver solicitudes en campo')
        ->name('gestion_campo.solicitud.show');

    Route::get('/gestion_campo/exportar/excel', [GestioncampoController::class, 'exportarExcel'])
        ->name('gestion_campo.exportar_excel')
        ->middleware('permission:Ver solicitudes en campo');

    Route::get('/gestion_campo/exportar/csv', [GestioncampoController::class, 'exportarCsv'])
        ->name('gestion_campo.exportar_csv')
        ->middleware('permission:Ver solicitudes en campo');

    Route::resource('gestion_campo', GestioncampoController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear paquetes');

    // Reserva de solicitudes (sistema de lock optimista)
    Route::get('/gestion_campo/solicitudes/reservadas', [GestioncampoController::class, 'reservadas'])
        ->middleware('permission:Crear paquetes')
        ->name('gestion_campo.reservadas');

    Route::post('/gestion_campo/solicitudes/liberar-todas', [GestioncampoController::class, 'liberarTodas'])
        ->middleware('permission:Crear paquetes')
        ->name('gestion_campo.liberar_todas');

    Route::post('/gestion_campo/solicitudes/heartbeat', [GestioncampoController::class, 'heartbeat'])
        ->middleware('permission:Crear paquetes')
        ->name('gestion_campo.heartbeat');

    Route::post('/gestion_campo/solicitudes/{id}/reservar', [GestioncampoController::class, 'reservar'])
        ->middleware('permission:Crear paquetes')
        ->name('gestion_campo.reservar');

    Route::post('/gestion_campo/solicitudes/{id}/liberar', [GestioncampoController::class, 'liberar'])
        ->middleware('permission:Crear paquetes')
        ->name('gestion_campo.liberar');

    // La consulta de paquetes se gobierna con 'Ver paquetes'. El listado de
    // solicitudes en campo conserva 'Ver solicitudes en campo': son dos
    // bandejas distintas y el permiso ya existía para separarlas.
    Route::get('/gestion_campo/package', [GestioncampoController::class, 'package'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package');

    Route::get('/gestion_campo/package/exportar/excel', [GestioncampoController::class, 'exportarPaquetesExcel'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package.exportar_excel');

    Route::get('/gestion_campo/package/exportar/csv', [GestioncampoController::class, 'exportarPaquetesCsv'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package.exportar_csv');

    Route::get('/gestion_campo/package/{id}', [GestioncampoController::class, 'showPackage'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package.show');

    Route::get('/gestion_campo/package/{id}/exportar/excel', [GestioncampoController::class, 'exportarSolicitudesPaqueteExcel'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package.solicitudes.exportar_excel');

    Route::get('/gestion_campo/package/{id}/exportar/csv', [GestioncampoController::class, 'exportarSolicitudesPaqueteCsv'])
        ->middleware('permission:Ver paquetes')
        ->name('gestion_campo.package.solicitudes.exportar_csv');

    Route::patch('/gestion_campo/package/{paqueteId}/solicitudes/{solicitudId}/liberar', [GestioncampoController::class, 'liberarSolicitudDePaquete'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.package.solicitud.liberar');

    Route::patch('/gestion_campo/package/{id}/entregar', [GestioncampoController::class, 'entregarPaquete'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.package.entregar');

    // Cancelar es definitivo y no comparte permiso con el resto de la edición
    // del paquete. Además solo puede hacerlo quien lo creó, lo que se
    // comprueba en el controlador porque depende del paquete concreto.
    Route::patch('/gestion_campo/package/{id}/cancelar', [GestioncampoController::class, 'cancelarPaquete'])
        ->middleware('permission:Cancelar paquetes')
        ->name('gestion_campo.package.cancelar');

    Route::patch('/gestion_campo/package/{paqueteId}/solicitudes/{solicitudId}/respuesta', [GestioncampoController::class, 'registrarRespuestaSolicitud'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.package.solicitud.respuesta');

    Route::get('/gestion_campo/solicitudes/{id}/opciones-reasignacion', [GestioncampoController::class, 'opcionesReasignacion'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.solicitud.opciones_reasignacion');

    Route::patch('/gestion_campo/solicitudes/{id}/reasignar', [GestioncampoController::class, 'reasignarSolicitud'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.solicitud.reasignar');

    Route::get('/gestion_campo/package/{id}/agregar', [GestioncampoController::class, 'showAgregarSolicitud'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.package.agregar');

    Route::post('/gestion_campo/package/{id}/agregar', [GestioncampoController::class, 'agregarSolicitudAPaquete'])
        ->middleware('permission:Editar paquetes')
        ->name('gestion_campo.package.agregar.store');

    Route::resource('gestion_roles', RoleController::class)
        ->only(['index'])
        ->middleware('permission:Ver roles');

    Route::get('/gestion_roles/exportar', [RoleController::class, 'exportar'])
        ->name('gestion_roles.exportar')
        ->middleware('permission:Ver roles');

    Route::resource('gestion_roles', RoleController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear roles');

    Route::resource('gestion_roles', RoleController::class)
        ->only(['edit', 'update'])
        ->parameters(['gestion_roles' => 'gestion_rol'])
        ->middleware('permission:Editar roles');

    Route::patch('gestion_roles/{gestion_rol}/toggle', [RoleController::class, 'toggle'])
        ->name('gestion_roles.toggle')
        ->middleware('permission:Inactivar roles');

    // --- Gestión de Calidad ---
    Route::get('/gestion_calidad', [GestioncalidadController::class, 'index'])
        ->name('gestion_calidad.index')
        ->middleware('permission:Ver solicitudes en calidad');

    Route::get('/gestion_calidad/exportar', [GestioncalidadController::class, 'exportar'])
        ->name('gestion_calidad.exportar')
        ->middleware('permission:Ver solicitudes en calidad');

    Route::get('/gestion_calidad/{solicitudId}', [GestioncalidadController::class, 'show'])
        ->name('gestion_calidad.show')
        ->middleware('permission:Ver solicitudes en calidad')
        ->where('solicitudId', '[0-9]+');

    Route::get('/gestion_calidad/{solicitudId}/descargar-soporte', [GestioncalidadController::class, 'descargarSoporte'])
        ->name('gestion_calidad.descargar_soporte')
        ->middleware('permission:Ver solicitudes en calidad')
        ->where('solicitudId', '[0-9]+');

    Route::get('/gestion_calidad/{solicitudId}/ver-soporte', [GestioncalidadController::class, 'verSoporte'])
        ->name('gestion_calidad.ver_soporte')
        ->middleware('permission:Ver solicitudes en calidad')
        ->where('solicitudId', '[0-9]+');

    Route::get('/gestion_calidad/{solicitudId}/registrar-hogar', [GestioncalidadController::class, 'registrarHogar'])
        ->name('gestion_calidad.registrar_hogar')
        ->middleware('permission:Crear hogares')
        ->where('solicitudId', '[0-9]+');

    Route::post('/gestion_calidad/{solicitudId}/registrar-hogar', [GestioncalidadController::class, 'storeHogar'])
        ->name('gestion_calidad.store_hogar')
        ->middleware('permission:Crear hogares')
        ->where('solicitudId', '[0-9]+');

    Route::delete('/gestion_calidad/{solicitudId}/registrar-hogar/liberar', [GestioncalidadController::class, 'liberarLockHogar'])
        ->name('gestion_calidad.liberar_lock_hogar')
        ->middleware('permission:Crear hogares')
        ->where('solicitudId', '[0-9]+');

    Route::get('/gestion_calidad/{solicitudId}/editar-hogar', [GestioncalidadController::class, 'editarHogar'])
        ->name('gestion_calidad.editar_hogar')
        ->middleware('permission:Editar hogares')
        ->where('solicitudId', '[0-9]+');

    Route::post('/gestion_calidad/{solicitudId}/editar-hogar', [GestioncalidadController::class, 'updateHogar'])
        ->name('gestion_calidad.update_hogar')
        ->middleware('permission:Editar hogares')
        ->where('solicitudId', '[0-9]+');

    // --- Parametrización del sistema ---
    Route::resource('gestion_puntos', GestionpuntoController::class)
        ->only(['index'])
        ->middleware('permission:Ver puntos de atención');

    Route::get('/gestion_puntos/exportar', [GestionpuntoController::class, 'exportar'])
        ->name('gestion_puntos.exportar')
        ->middleware('permission:Ver puntos de atención');

    Route::resource('gestion_puntos', GestionpuntoController::class)
        ->only(['create', 'store'])
        ->middleware('permission:Crear puntos de atención');

    Route::resource('gestion_puntos', GestionpuntoController::class)
        ->only(['edit', 'update'])
        ->parameters(['gestion_puntos' => 'gestion_punto'])
        ->middleware('permission:Editar puntos de atención');

    // Activar y desactivar el punto. Es la única vía: el destroy del resource
    // hacía exactamente esto mismo y se retiró por redundante.
    Route::patch('gestion_puntos/{gestion_punto}/toggle', [GestionpuntoController::class, 'toggle'])
        ->name('gestion_puntos.toggle')
        ->middleware('permission:Inactivar puntos de atención');

    Route::get('/gestion_documentos_publicos', [GestiondocumentopublicoController::class, 'index'])
        ->name('gestion_documentos_publicos.index')
        ->middleware('permission:Ver documentos públicos');

    Route::get('/gestion_documentos_publicos/create', [GestiondocumentopublicoController::class, 'create'])
        ->name('gestion_documentos_publicos.create')
        ->middleware('permission:Crear documentos públicos');

    Route::post('/gestion_documentos_publicos', [GestiondocumentopublicoController::class, 'store'])
        ->name('gestion_documentos_publicos.store')
        ->middleware('permission:Crear documentos públicos');

    Route::get('/gestion_documentos_publicos/{gestion_documento_publico}/edit', [GestiondocumentopublicoController::class, 'edit'])
        ->name('gestion_documentos_publicos.edit')
        ->middleware('permission:Editar documentos públicos');

    Route::put('/gestion_documentos_publicos/{gestion_documento_publico}', [GestiondocumentopublicoController::class, 'update'])
        ->name('gestion_documentos_publicos.update')
        ->middleware('permission:Editar documentos públicos');

    Route::patch('/gestion_documentos_publicos/{gestion_documento_publico}/toggle', [GestiondocumentopublicoController::class, 'toggle'])
        ->name('gestion_documentos_publicos.toggle')
        ->middleware('permission:Inactivar documentos públicos');

    Route::get('/gestion_encuestadores', [GestionencuestadorController::class, 'index'])
        ->name('gestion_encuestadores.index')
        ->middleware('permission:Ver encuestadores');

    Route::get('/gestion_encuestadores/exportar', [GestionencuestadorController::class, 'exportar'])
        ->name('gestion_encuestadores.exportar')
        ->middleware('permission:Ver encuestadores');

    Route::get('/gestion_encuestadores/create', [GestionencuestadorController::class, 'create'])
        ->name('gestion_encuestadores.create')
        ->middleware('permission:Crear encuestadores');

    Route::post('/gestion_encuestadores', [GestionencuestadorController::class, 'store'])
        ->name('gestion_encuestadores.store')
        ->middleware('permission:Crear encuestadores');

    Route::get('/gestion_encuestadores/{id}/edit', [GestionencuestadorController::class, 'edit'])
        ->name('gestion_encuestadores.edit')
        ->middleware('permission:Editar encuestadores');

    Route::put('/gestion_encuestadores/{id}', [GestionencuestadorController::class, 'update'])
        ->name('gestion_encuestadores.update')
        ->middleware('permission:Editar encuestadores');

    Route::patch('gestion_encuestadores/{gestion_encuestador}/toggle', [GestionencuestadorController::class, 'toggle'])
        ->name('gestion_encuestadores.toggle')
        ->middleware('permission:Inactivar encuestadores');

    Route::get('/gestion_reportes', [GestionreportesController::class, 'index'])
    ->name('gestion_reportes.index')
    ->middleware('permission:Ver reportes');

    Route::get('/gestion_reportes/export', [GestionreportesController::class, 'export'])
    ->name('gestion_reportes.export')
    ->middleware('permission:Ver reportes');

    Route::get('/gestion_reportes/opciones', [GestionreportesController::class, 'opciones'])
    ->name('gestion_reportes.opciones')
    ->middleware('permission:Ver reportes');

    Route::get('/gestion_auditoria', [GestionauditoriaController::class, 'index'])
        ->name('gestion_auditoria.index')
        ->middleware('permission:Ver auditoría');

    Route::get('/gestion_auditoria/exportar', [GestionauditoriaController::class, 'exportar'])
        ->name('gestion_auditoria.exportar')
        ->middleware('permission:Ver auditoría');

    Route::get('/gestion_auditoria/{id}', [GestionauditoriaController::class, 'show'])
        ->name('gestion_auditoria.show')
        ->middleware('permission:Ver auditoría')
        ->where('id', '[0-9]+');

});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

/*RUTAS PÚBLICAS (sin autenticación)*/
Route::resource('acerca_de', AcercaDeController::class)
    ->only(['index']);

require __DIR__ . '/settings.php';
