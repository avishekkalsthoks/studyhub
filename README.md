# StudyHub – Collaborative Study Platform

A study platform with group chat, task manager, shared resources, and pomodoro timer.
**Runs on XAMPP (Apache + MySQL) with PHP backend!**

## Tech Stack

| Part | Technology |
|------|-----------|
| Frontend | HTML, CSS, JavaScript, jQuery |
| Backend | PHP (MySQLi) |
| Database | MySQL (XAMPP) |
| Server | Apache (XAMPP) |

## File Structure

```
StudyHub/
├── .htaccess              # Apache config
├── init_db.py             # One-time DB setup (Python)
├── README.md              # This file
├── uploads/               # User-uploaded files
│   └── .htaccess          # Security: no PHP execution
├── api/
│   ├── config.php         # DB connection + JWT helpers
│   ├── auth.php           # Login / Signup
│   ├── messages.php       # Study chat API
│   ├── tasks.php          # Task manager API
│   ├── pomodoro.php       # Pomodoro stats API
│   └── resources.php      # Resource upload/list API
├── database/
│   └── schema.sql         # Database schema
└── frontend/
    ├── index.html         # Landing page
    ├── login.html         # Auth page
    ├── dashboard.html     # Main app
    ├── app.js             # jQuery-based logic
    └── style.css          # All styles
```

## How to Run

### Step 1: Copy to XAMPP
Copy the `StudyHub` folder to `C:\xampp\htdocs\`

### Step 2: Start XAMPP
Open XAMPP Control Panel, start **Apache** and **MySQL**

### Step 3: Set up the database
```
python init_db.py
```
It will ask for your MySQL root password.

### Step 4: Open the app
Go to **http://localhost/StudyHub/frontend/** in your browser!

## Features

- **💬 Chat** – Text chat rooms for studying
- **✅ Tasks** – Add/delete tasks with priority & deadlines
- **⏱️ Timer** – Pomodoro focus timer with stats
- **📁 Resources** – Upload & share study materials (PDF, DOCX, images, etc.)
