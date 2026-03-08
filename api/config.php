<?php
// ==========================================
// StudyHub - Database & Auth Configuration
// MySQLi connection + JWT helpers
// ==========================================

// --- CORS Headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Settings ---
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'studyhub');

// --- JWT Secret ---
define('JWT_SECRET', 'studyhub_secret_key_123');
define('JWT_EXPIRY', 7 * 24 * 3600); // 7 days

// ==========================================
// Connect to MySQL
// ==========================================
function get_db() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(["error" => "Database connection failed"]);
        exit();
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

// ==========================================
// JWT Encode / Decode (no external libs)
// ==========================================
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode($payload) {
    $header = json_encode(["alg" => "HS256", "typ" => "JWT"]);
    $payload["exp"] = time() + JWT_EXPIRY;

    $headerB64 = base64url_encode($header);
    $payloadB64 = base64url_encode(json_encode($payload));
    $signature = hash_hmac("sha256", "$headerB64.$payloadB64", JWT_SECRET, true);
    $signatureB64 = base64url_encode($signature);

    return "$headerB64.$payloadB64.$signatureB64";
}

function jwt_decode($token) {
    $parts = explode(".", $token);
    if (count($parts) !== 3) return null;

    list($headerB64, $payloadB64, $signatureB64) = $parts;

    // Verify signature
    $signature = hash_hmac("sha256", "$headerB64.$payloadB64", JWT_SECRET, true);
    $expectedSig = base64url_encode($signature);

    if (!hash_equals($expectedSig, $signatureB64)) return null;

    // Decode payload
    $payload = json_decode(base64url_decode($payloadB64), true);
    if (!$payload) return null;

    // Check expiry
    if (isset($payload["exp"]) && $payload["exp"] < time()) return null;

    return $payload;
}

// ==========================================
// Get Current User from Authorization header
// ==========================================
function get_current_user_from_token() {
    // Get Authorization header (handles Apache stripping it)
    $auth = "";
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        // Case-insensitive lookup (some servers change case)
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $auth = $value;
                break;
            }
        }
    }
    // Fallback: Apache sometimes puts it in HTTP_AUTHORIZATION or REDIRECT_HTTP_AUTHORIZATION
    if (!$auth && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!$auth && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (strpos($auth, "Bearer ") !== 0) {
        http_response_code(401);
        echo json_encode(["error" => "Not logged in"]);
        exit();
    }

    $token = substr($auth, 7);
    $user = jwt_decode($token);

    if (!$user) {
        http_response_code(403);
        echo json_encode(["error" => "Invalid or expired token"]);
        exit();
    }

    return $user;
}

// ==========================================
// Helper: send JSON response
// ==========================================
function send_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function send_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(["error" => $message]);
    exit();
}
?>
