<?php
// ==========================================
// StudyHub - Authentication API
// POST ?action=signup  — Create account
// POST ?action=login   — Login
// ==========================================

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

// ==========================================
// SIGNUP
// ==========================================
if ($action === 'signup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $username = isset($input['username']) ? trim($input['username']) : '';
    $email    = isset($input['email'])    ? trim($input['email'])    : '';
    $password = isset($input['password']) ? $input['password']       : '';

    if (!$username || !$email || !$password) {
        send_error("Please fill in all fields", 400);
    }

    $conn = get_db();

    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        $conn->close();
        send_error("Username or email already taken", 409);
    }
    $stmt->close();

    // Hash password
    $hashed = password_hash($password, PASSWORD_BCRYPT);

    // Random avatar color
    $colors = ['#6C63FF', '#FF6584', '#43E97B', '#F7971E', '#00D2FF', '#A18CD1'];
    $color = $colors[array_rand($colors)];

    // Insert user
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $username, $email, $hashed, $color);
    $stmt->execute();
    $user_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    // Create JWT
    $token = jwt_encode([
        "id"       => $user_id,
        "username" => $username,
        "email"    => $email
    ]);

    send_json([
        "message" => "Account created!",
        "token"   => $token,
        "user"    => [
            "id"           => $user_id,
            "username"     => $username,
            "email"        => $email,
            "avatar_color" => $color
        ]
    ]);
}

// ==========================================
// LOGIN
// ==========================================
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $email    = isset($input['email'])    ? trim($input['email'])    : '';
    $password = isset($input['password']) ? $input['password']       : '';

    if (!$email || !$password) {
        send_error("Please fill in all fields", 400);
    }

    $conn = get_db();

    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    if (!$user) {
        send_error("Wrong email or password", 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        send_error("Wrong email or password", 401);
    }

    // Create JWT
    $token = jwt_encode([
        "id"       => $user['id'],
        "username" => $user['username'],
        "email"    => $user['email']
    ]);

    send_json([
        "message" => "Login successful!",
        "token"   => $token,
        "user"    => [
            "id"           => $user['id'],
            "username"     => $user['username'],
            "email"        => $user['email'],
            "avatar_color" => $user['avatar_color'] ?? '#6C63FF'
        ]
    ]);
}

// If no valid action matched
send_error("Invalid action", 400);
?>
