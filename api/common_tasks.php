<?php
// ==========================================
// StudyHub - Common Tasks API (Shared)
// POST          — Add a shared task
// GET           — Get all shared tasks
// DELETE ?id=X  — Delete own shared task
// ==========================================

require_once __DIR__ . '/config.php';

$user = get_current_user_from_token();
$conn = get_db();

// Some older StudyHub databases were created before this table existed.
// We create it here if missing so the Common Tasks tab always works.
function ensure_common_tasks_table_exists($conn) {
    $createSql = "CREATE TABLE IF NOT EXISTS common_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )";

    $ok = $conn->query($createSql);
    if (!$ok) {
        $conn->close();
        send_error("Failed to prepare common tasks table", 500);
    }
}

ensure_common_tasks_table_exists($conn);

// ==========================================
// GET — List all common tasks
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare(
        "SELECT ct.*, u.username, u.avatar_color
         FROM common_tasks ct JOIN users u ON ct.user_id = u.id
         ORDER BY ct.created_at DESC LIMIT 100"
    );
    $stmt->execute();
    $result = $stmt->get_result();

    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        if ($row['created_at']) $row['created_at'] = (string)$row['created_at'];
        if ($row['due_date'])   $row['due_date']   = (string)$row['due_date'];
        $tasks[] = $row;
    }
    $stmt->close();
    $conn->close();

    send_json(["tasks" => $tasks]);
}

// ==========================================
// POST — Add a common task
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $title       = isset($input['title'])       ? trim($input['title'])       : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $due_date    = isset($input['due_date'])    ? $input['due_date']          : null;
    $priority    = isset($input['priority'])    ? $input['priority']          : 'medium';

    if (!$title) {
        $conn->close();
        send_error("Title is required", 400);
    }

    $stmt = $conn->prepare("INSERT INTO common_tasks (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issss", $user['id'], $title, $description, $due_date, $priority);
    $stmt->execute();
    $task_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    send_json([
        "message" => "Common task added!",
        "task"    => [
            "id"       => $task_id,
            "title"    => $title,
            "status"   => "pending"
        ]
    ]);
}

// ==========================================
// DELETE — Delete own common task
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $task_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$task_id) {
        $conn->close();
        send_error("Task ID required", 400);
    }

    $stmt = $conn->prepare("DELETE FROM common_tasks WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $task_id, $user['id']);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    send_json(["message" => "Common task deleted!"]);
}

$conn->close();
send_error("Method not allowed", 405);
?>
