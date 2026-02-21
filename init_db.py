# ==========================================
# StudyHub - Database Setup Script
# Run this ONCE to create the database tables
# Usage: python init_db.py
# ==========================================

import mysql.connector

# --- Database settings ---
MYSQL_HOST = "localhost"
MYSQL_USER = "root"
MYSQL_PASSWORD = ""

print("")
print("🗄️  StudyHub Database Setup")
print("=" * 40)

# Ask for MySQL root password
password = input("Enter MySQL root password (press Enter if none): ")

try:
    conn = mysql.connector.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=password
    )
    cursor = conn.cursor()
    print("✅ Connected to MySQL")

    # Create database
    cursor.execute("CREATE DATABASE IF NOT EXISTS studyhub")
    cursor.execute("USE studyhub")
    print("✅ Database 'studyhub' ready")

    # Create tables
    tables = [
        # Users table
        """CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar_color VARCHAR(20) DEFAULT '#6C63FF',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",

        # Messages table (for study chat)
        """CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            content TEXT NOT NULL,
            room VARCHAR(50) DEFAULT 'general',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )""",

        # Tasks table
        """CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            due_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""",

        # Pomodoro sessions
        """CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            duration INT NOT NULL,
            session_type ENUM('work', 'short_break', 'long_break') DEFAULT 'work',
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""",

        # Shared Resources (file uploads)
        """CREATE TABLE IF NOT EXISTS resources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            url TEXT,
            category VARCHAR(100) DEFAULT 'general',
            file_path VARCHAR(500),
            file_type VARCHAR(100),
            file_size VARCHAR(50),
            original_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""",

        # Common Tasks (shared with everyone)
        """CREATE TABLE IF NOT EXISTS common_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date DATE,
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"""
    ]

    table_names = ["users", "messages", "tasks", "pomodoro_sessions", "resources", "common_tasks"]

    for i, table_sql in enumerate(tables):
        cursor.execute(table_sql)
        print(f"   ✅ Table '{table_names[i]}' created")

    # Create the app user (so PHP can connect)
    try:
        cursor.execute("CREATE USER 'studyhub_user'@'localhost' IDENTIFIED BY 'studyhub_pass'")
    except:
        pass  # User already exists

    cursor.execute("GRANT ALL PRIVILEGES ON studyhub.* TO 'studyhub_user'@'localhost'")
    cursor.execute("FLUSH PRIVILEGES")
    print("✅ Database user 'studyhub_user' ready")

    conn.commit()
    cursor.close()
    conn.close()

    print("")
    print("🎉 Database setup complete!")
    print("   Now open http://localhost/StudyHub/frontend/ in your browser")
    print("")

except mysql.connector.Error as err:
    print(f"❌ MySQL Error: {err}")
    print("")
    print("Common fixes:")
    print("  1. Make sure XAMPP MySQL is running")
    print("  2. Check your root password")
    print("  3. Try: mysql -u root -p")
except Exception as e:
    print(f"❌ Error: {e}")
