<?php
// ==========================================
// StudyHub - Resources API
// POST          — Upload a resource file
// GET           — List all resources
// DELETE ?id=X  — Delete own resource
// ==========================================

require_once __DIR__ . '/config.php';

$user = get_current_user_from_token();
$conn = get_db();

// Upload directory
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Allowed file types
$allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
];
$maxFileSize = 10 * 1024 * 1024; // 10 MB

// ==========================================
// GET — List all resources (from all users)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare(
        "SELECT r.id, r.user_id, r.title, r.url, r.category, r.file_path, r.file_type, r.file_size,
                r.original_name, r.created_at, u.username, u.avatar_color
         FROM resources r JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC LIMIT 100"
    );
    $stmt->execute();
    $result = $stmt->get_result();

    $resources = [];
    while ($row = $result->fetch_assoc()) {
        $row['created_at'] = (string)$row['created_at'];
        $resources[] = $row;
    }
    $stmt->close();
    $conn->close();

    send_json(["resources" => $resources]);
}

// ==========================================
// POST — Upload a resource
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title    = isset($_POST['title'])    ? trim($_POST['title'])    : '';
    $category = isset($_POST['category']) ? trim($_POST['category']) : 'general';

    if (!$title) {
        $conn->close();
        send_error("Title is required", 400);
    }

    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $conn->close();
        send_error("Please select a file to upload", 400);
    }

    $file = $_FILES['file'];

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        $conn->close();
        send_error("File too large. Maximum size is 10 MB", 400);
    }

    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        $conn->close();
        send_error("File type not allowed. Supported: PDF, DOC, XLS, PPT, images, TXT, ZIP", 400);
    }

    // Generate unique filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $uniqueName = uniqid('res_', true) . '.' . $ext;
    $filePath = $uploadDir . $uniqueName;

    // Move the file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        $conn->close();
        send_error("Failed to save file", 500);
    }

    // Save to database
    $originalName = $file['name'];
    $fileSize = $file['size'];
    $dbPath = 'uploads/' . $uniqueName;

    $stmt = $conn->prepare(
        "INSERT INTO resources (user_id, title, category, file_path, file_type, file_size, original_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("issssss", $user['id'], $title, $category, $dbPath, $mimeType, $fileSize, $originalName);
    $stmt->execute();
    $resource_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    send_json([
        "message"  => "Resource uploaded!",
        "resource" => [
            "id"       => $resource_id,
            "title"    => $title,
            "category" => $category,
            "file_path" => $dbPath
        ]
    ]);
}

// ==========================================
// DELETE — Delete own resource
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $resource_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$resource_id) {
        $conn->close();
        send_error("Resource ID required", 400);
    }

    // Get the file path first (only if owned by user)
    $stmt = $conn->prepare("SELECT file_path FROM resources WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $resource_id, $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $resource = $result->fetch_assoc();
    $stmt->close();

    if (!$resource) {
        $conn->close();
        send_error("Resource not found or not yours", 404);
    }

    // Delete the file from disk
    $fullPath = __DIR__ . '/../' . $resource['file_path'];
    if (file_exists($fullPath)) {
        unlink($fullPath);
    }

    // Delete from database
    $stmt = $conn->prepare("DELETE FROM resources WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $resource_id, $user['id']);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    send_json(["message" => "Resource deleted!"]);
}

$conn->close();
send_error("Method not allowed", 405);
?>
