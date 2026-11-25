<?php

use App\Http\Controllers\GestionreportesController;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Http\Request;
use PDO;

test('normaliza múltiples filtros del reporte', function () {
    $controller = new GestionreportesController();
    $method = new ReflectionMethod($controller, 'getFilters');
    $method->setAccessible(true);

    $request = Request::create('/gestion_reportes', 'GET', [
        'comuna_ids' => '1,2',
        'barrio_ids' => '10,11',
        'estados' => 'registrada,enviada_a_campo',
        'punto_atencion_ids' => '3,4',
        'tipo_solicitud_ids' => '5,6',
        'canal_ids' => '7,8',
    ]);

    $filters = $method->invoke($controller, $request);

    expect($filters['comuna_ids'])->toEqual([1, 2])
        ->and($filters['barrio_ids'])->toEqual([10, 11])
        ->and($filters['estados'])->toEqual(['registrada', 'enviada_a_campo'])
        ->and($filters['punto_atencion_ids'])->toEqual([3, 4])
        ->and($filters['tipo_solicitud_ids'])->toEqual([5, 6])
        ->and($filters['canal_ids'])->toEqual([7, 8]);
});

test('aplica filtros del reporte con columnas cualificadas para postgres', function () {
    $connection = new SQLiteConnection(new PDO('sqlite::memory:'));
    $resolver = new class($connection) implements ConnectionResolverInterface {
        public function __construct(protected $connection) {}

        public function connection($name = null)
        {
            return $this->connection;
        }

        public function getDefaultConnection()
        {
            return 'default';
        }

        public function setDefaultConnection($name)
        {
            return null;
        }
    };

    Model::setConnectionResolver($resolver);

    $controller = new GestionreportesController();
    $method = new ReflectionMethod($controller, 'buildQuery');
    $method->setAccessible(true);

    $query = $method->invoke($controller, [
        'fecha_inicio' => null,
        'fecha_fin' => null,
        'comuna_ids' => [1],
        'barrio_ids' => [10],
        'estados' => [],
        'punto_atencion_ids' => [],
        'tipo_solicitud_ids' => [],
        'canal_ids' => [],
    ]);

    $reflection = new ReflectionClass($query);
    $property = $reflection->getProperty('query');
    $property->setAccessible(true);
    $builder = $property->getValue($query);
    $wheres = $builder->wheres ?? [];

    $conditions = array_column($wheres, 'column');

    expect($conditions)->toContain('solicitud.comuna_id')
        ->and($conditions)->toContain('solicitud.barrio_id');
});
