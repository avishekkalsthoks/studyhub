<?php
// ==========================================
// StudyHub - Task Manager API
// POST          — Add task
// GET           — Get all user tasks
// PUT ?id=X     — Update task
// DELETE ?id=X  — Delete task
// ==========================================

require_once __DIR__ . '/config.php';

$user = get_current_user_from_token();
$conn = get_db();

// ==========================================
// GET — Get all tasks for user
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $user['id']);
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
// POST — Add a new task
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

    $stmt = $conn->prepare("INSERT INTO tasks (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issss", $user['id'], $title, $description, $due_date, $priority);
    $stmt->execute();
    $task_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    send_json([
        "message" => "Task added!",
        "task"    => [
            "id"       => $task_id,
            "title"    => $title,
            "status"   => "pending",
            "priority" => $priority
        ]
    ]);
}

// ==========================================
// PUT — Update a task
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $task_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$task_id) {
        $conn->close();
        send_error("Task ID required", 400);
    }

    $input = json_decode(file_get_contents("php://input"), true);

    $updates = [];
    $values  = [];
    $types   = "";

    if (!empty($input['title']))       { $updates[] = "title = ?";       $values[] = $input['title'];       $types .= "s"; }
    if (!empty($input['description'])) { $updates[] = "description = ?"; $values[] = $input['description']; $types .= "s"; }
    if (!empty($input['due_date']))    { $updates[] = "due_date = ?";    $values[] = $input['due_date'];    $types .= "s"; }
    if (!empty($input['priority']))    { $updates[] = "priority = ?";    $values[] = $input['priority'];    $types .= "s"; }
    if (!empty($input['status']))      { $updates[] = "status = ?";      $values[] = $input['status'];      $types .= "s"; }

    if (empty($updates)) {
        $conn->close();
        send_error("Nothing to update", 400);
    }

    $sql = "UPDATE tasks SET " . implode(", ", $updates) . " WHERE id = ? AND user_id = ?";
    $values[] = $task_id;
    $values[] = $user['id'];
    $types .= "ii";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    send_json(["message" => "Task updated!"]);
}

// ==========================================
// DELETE — Delete a task
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $task_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$task_id) {
        $conn->close();
        send_error("Task ID required", 400);
    }

    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $task_id, $user['id']);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    send_json(["message" => "Task deleted!"]);
}

$conn->close();
send_error("Method not allowed", 405);
?>
