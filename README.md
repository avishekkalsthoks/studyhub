# StudyHub

StudyHub is a web-based study platform I built using PHP and MySQL. It runs locally on XAMPP and gives you a dashboard with a bunch of tools — chat rooms, a task manager, a pomodoro timer, shared resources, etc.

## Stack

- **Frontend:** HTML/CSS/JS with jQuery
- **Backend:** PHP using MySQLi
- **Database:** MySQL
- **Server:** Apache via XAMPP

## Project Structure

```
StudyHub/
|-- .htaccess
|-- init_db.py
|-- README.md
|-- uploads/
|-- api/
|   |-- config.php        (DB config, JWT auth helpers)
|   |-- auth.php           (login + signup endpoints)
|   |-- messages.php       (chat messages)
|   |-- tasks.php          (personal task CRUD)
|   |-- common_tasks.php   (shared tasks for everyone)
|   |-- pomodoro.php       (timer session tracking)
|   |-- resources.php      (file upload/download)
|-- database/
|   |-- schema.sql
|-- frontend/
    |-- index.html         (landing page)
    |-- login.html         (login/signup)
    |-- dashboard.html     (main app)
    |-- app.js             (all the JS logic)
    |-- style.css
```

## Setup (XAMPP)

1. Drop the `StudyHub` folder into `C:\xampp\htdocs\`
2. Start Apache + MySQL from the XAMPP Control Panel
3. Run `python init_db.py` to set up the database (it'll prompt for your MySQL root password)
4. Open `http://localhost/StudyHub/` in your browser

If you don't have Python, you can also import `database/schema.sql` manually through phpMyAdmin.

## What it does

- **Chat** — real-time(ish) text rooms for group study. Rooms for general, math, science, programming, exam prep.
- **Task Manager** — personal to-do list with priorities (low/med/high) and due dates. Filter by status.
- **Common Tasks** — shared board where anyone can post assignments or deadlines visible to all users.
- **Pomodoro Timer** — 25/5/15 minute sessions with a tracker that logs your focus time.
- **Resources** — upload and share files (PDF, DOCX, images, etc). 10MB max per file.

## Auth

Uses JWT tokens stored in localStorage. No external libraries — the JWT encode/decode is just plain PHP with HMAC-SHA256. Passwords are hashed with bcrypt (`password_hash`).

## Notes

- The DB credentials default to `root` with no password (standard XAMPP setup)
- File uploads go to `uploads/` with PHP execution blocked via .htaccess
- CORS is wide open since this is just a local dev project
