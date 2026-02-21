<?php
// ==========================================
// StudyHub - Study Chat Messages API
// POST            — Send a message
// GET ?room=xxx   — Get messages for a room
// ==========================================

require_once __DIR__ . '/config.php';

$user = get_current_user_from_token();
$conn = get_db();

// ==========================================
// GET — Load messages for a room
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $room = isset($_GET['room']) ? $_GET['room'] : 'general';

    $stmt = $conn->prepare(
        "SELECT m.id, m.sender_id, u.username AS sender_name, u.avatar_color,
                m.content, m.room, m.created_at
         FROM messages m JOIN users u ON m.sender_id = u.id
         WHERE m.room = ? ORDER BY m.created_at DESC LIMIT 50"
    );
    $stmt->bind_param("s", $room);
    $stmt->execute();
    $result = $stmt->get_result();

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $row['created_at'] = (string)$row['created_at'];
        $messages[] = $row;
    }
    $stmt->close();
    $conn->close();

    // Reverse to show oldest first
    $messages = array_reverse($messages);

    send_json(["messages" => $messages]);
}

// ==========================================
// POST — Send a message
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $content = isset($input['content']) ? trim($input['content']) : '';
    $room    = isset($input['room'])    ? trim($input['room'])    : 'general';

    if (!$content) {
        $conn->close();
        send_error("Message cannot be empty", 400);
    }

    $stmt = $conn->prepare("INSERT INTO messages (sender_id, content, room) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $user['id'], $content, $room);
    $stmt->execute();
    $msg_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    send_json([
        "message" => "Sent!",
        "data"    => [
            "id"          => $msg_id,
            "sender_name" => $user['username'],
            "content"     => $content,
            "room"        => $room
        ]
    ]);
}

$conn->close();
send_error("Method not allowed", 405);
?>
