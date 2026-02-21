<?php
// ==========================================
// StudyHub - Pomodoro Timer API
// POST  — Save completed session
// GET   — Get stats
// ==========================================

require_once __DIR__ . '/config.php';

$user = get_current_user_from_token();
$conn = get_db();

// ==========================================
// GET — Get pomodoro stats
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare(
        "SELECT 
            COUNT(*) as total_sessions,
            COALESCE(SUM(duration), 0) as total_minutes,
            COUNT(CASE WHEN DATE(completed_at) = CURDATE() THEN 1 END) as today_sessions,
            COALESCE(SUM(CASE WHEN DATE(completed_at) = CURDATE() THEN duration ELSE 0 END), 0) as today_minutes
         FROM pomodoro_sessions WHERE user_id = ?"
    );
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    send_json(["sessions" => [], "stats" => $stats]);
}

// ==========================================
// POST — Save a completed session
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $duration     = isset($input['duration'])     ? intval($input['duration'])     : 0;
    $session_type = isset($input['session_type']) ? $input['session_type']          : 'work';

    if ($duration <= 0) {
        $conn->close();
        send_error("Duration required", 400);
    }

    $stmt = $conn->prepare("INSERT INTO pomodoro_sessions (user_id, duration, session_type) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $user['id'], $duration, $session_type);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    send_json(["message" => "Session saved!"]);
}

$conn->close();
send_error("Method not allowed", 405);
?>
