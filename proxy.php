<?php
/**
 * proxy.php — Proxy para PVGIS API v5.3
 * Endpoints soportados: MRcalc, DRcalc, seriescalc
 */

// Desactivar salida de warnings/notices para no contaminar el JSON
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Buffer de salida — asegura que nada se escape antes del JSON
ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

// Verificar que curl esté disponible
if (!function_exists('curl_init')) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'error' => 'La extensión cURL de PHP no está habilitada',
        'detalle' => 'Habilita extension=curl en php.ini y reinicia Apache'
    ]);
    exit;
}

// Endpoint solicitado
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : 'MRcalc';
$endpoint = preg_replace('/[^a-zA-Z0-9_]/', '', $endpoint);

// Lista blanca de endpoints permitidos
$permitidos = ['MRcalc', 'DRcalc', 'seriescalc'];
if (!in_array($endpoint, $permitidos)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'error' => "Endpoint '$endpoint' no permitido",
        'permitidos' => $permitidos
    ]);
    exit;
}

// Quitar 'endpoint' de los parámetros
$params = $_GET;
unset($params['endpoint']);

// Construir URL de PVGIS
$pvgisUrl = 'https://re.jrc.ec.europa.eu/api/v5_3/' . $endpoint . '?' . http_build_query($params);

// cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $pvgisUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 180);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 20);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; SistemaFV/1.0)');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
$curlNo   = curl_errno($ch);
curl_close($ch);

// Limpiar el buffer sin enviarlo
ob_end_clean();

if ($response === false || $curlNo !== 0) {
    http_response_code(502);
    echo json_encode([
        'error' => 'No se pudo conectar con PVGIS',
        'detalle' => $curlErr,
        'codigo' => $curlNo,
        'url' => $pvgisUrl
    ]);
    exit;
}

http_response_code($httpCode ?: 200);
echo $response;