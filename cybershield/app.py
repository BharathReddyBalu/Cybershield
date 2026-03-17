from flask import Flask, render_template, request, redirect, url_for, session, flash
import sqlite3
import hashlib
import os
from datetime import datetime

# --- Configuration ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")
SECRET_KEY = os.environ.get("CYBERSHIELD_SECRET_KEY", "super-secret-key")  # replace for production

app = Flask(__name__)
app.secret_key = SECRET_KEY

# --- Database helpers ---

def get_db_connection():
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database schema if it does not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table (authentication)
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"""
    )

    # Scan results table (stores user scans for auditing)
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            scan_type TEXT NOT NULL,
            input_value TEXT,
            result TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )"""
    )

    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    """Hash a password using SHA256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def is_logged_in() -> bool:
    """Return True if a user is currently logged in."""
    return "user_id" in session


def get_current_user():
    """Return the current logged in user from the session."""
    if not is_logged_in():
        return None

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    conn.close()
    return user


def save_scan_result(user_id: int, scan_type: str, input_value: str, result: str):
    """Store a scan result in the database for the logged-in user."""
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO scans (user_id, scan_type, input_value, result, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, scan_type, input_value, result, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


# --- App routes ---

@app.route("/")
def index():
    """Redirect users to the dashboard if logged in, otherwise to login."""
    if is_logged_in():
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    """Create a new user account."""
    if is_logged_in():
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not email or not password:
            flash("All fields are required.", "error")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template("register.html")

        password_hash = hash_password(password)

        try:
            conn = get_db_connection()
            conn.execute(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (username, email, password_hash, datetime.utcnow().isoformat()),
            )
            conn.commit()
            conn.close()
            flash("Account created successfully. Please log in.", "success")
            return redirect(url_for("login"))
        except sqlite3.IntegrityError:
            flash("Username or email already exists.", "error")

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    """Authenticate a user."""
    if is_logged_in():
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username_or_email = request.form.get("username_or_email", "").strip()
        password = request.form.get("password", "")

        if not username_or_email or not password:
            flash("Please provide your username/email and password.", "error")
            return render_template("login.html")

        password_hash = hash_password(password)

        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE (username = ? OR email = ?) AND password_hash = ?",
            (username_or_email, username_or_email, password_hash),
        ).fetchone()
        conn.close()

        if user:
            session["user_id"] = user["id"]
            flash("Logged in successfully.", "success")
            return redirect(url_for("dashboard"))

        flash("Invalid credentials. Please try again.", "error")

    return render_template("login.html")


@app.route("/logout")
def logout():
    """Log the user out."""
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    """Render the user dashboard with navigation to tools and scan history."""
    if not is_logged_in():
        return redirect(url_for("login"))

    user = get_current_user()
    conn = get_db_connection()

    # Per-type scan counts for stat chips
    rows = conn.execute(
        "SELECT scan_type, COUNT(*) as cnt FROM scans WHERE user_id = ? GROUP BY scan_type",
        (session["user_id"],),
    ).fetchall()
    scan_counts = {r["scan_type"]: r["cnt"] for r in rows}
    total_scans = sum(scan_counts.values())

    # Recent 10 scans for history table
    recent_scans = conn.execute(
        "SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        (session["user_id"],),
    ).fetchall()
    conn.close()

    return render_template(
        "dashboard.html",
        user=user,
        scan_counts=scan_counts,
        total_scans=total_scans,
        recent_scans=recent_scans,
    )


@app.route("/password-checker", methods=["GET", "POST"])
def password_checker():
    """Analyze password strength and store the result."""
    if not is_logged_in():
        return redirect(url_for("login"))

    result = None
    password = ""

    if request.method == "POST":
        password = request.form.get("password", "")
        strength = "Weak"
        score = 0

        length = len(password)
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(not c.isalnum() for c in password)

        if length >= 8:
            score += 1
        if length >= 12:
            score += 1
        if has_upper:
            score += 1
        if has_lower:
            score += 1
        if has_digit:
            score += 1
        if has_special:
            score += 1

        if score >= 5:
            strength = "Strong"
        elif score >= 3:
            strength = "Medium"

        result = {
            "strength": strength,
            "length": length,
            "has_upper": has_upper,
            "has_lower": has_lower,
            "has_digit": has_digit,
            "has_special": has_special,
            "score": score,
            "max_score": 6,
        }

        save_scan_result(
            session["user_id"],
            "password_checker",
            "<redacted>",
            f"{strength} (score={score})",
        )

    return render_template("password_checker.html", result=result, password=password)


@app.route("/url-scanner", methods=["GET", "POST"])
def url_scanner():
    """Evaluate a URL for common phishing indicators."""
    if not is_logged_in():
        return redirect(url_for("login"))

    url = ""
    risk = None
    reasons = []

    if request.method == "POST":
        url = request.form.get("url", "").strip()
        if url:
            normalized = url.lower()
            is_https = normalized.startswith("https://")
            suspicious_patterns = ["%40", "@", "//", "..", "secure", "login", "verify", "update", "bank", "account", "confirm", "webscr"]

            score = 0

            if not is_https:
                reasons.append("Not using HTTPS")
                score += 2

            for pattern in suspicious_patterns:
                if pattern in normalized:
                    reasons.append(f"Contains suspicious token: '{pattern}'")
                    score += 1

            # Use simple heuristics
            if "http" in normalized and "https" not in normalized:
                reasons.append("Mixed or missing HTTPS prefix")
                score += 1

            if score >= 4:
                risk = "Dangerous"
            elif score >= 2:
                risk = "Suspicious"
            else:
                risk = "Safe"

            save_scan_result(
                session["user_id"],
                "url_scanner",
                url,
                f"{risk} ({'; '.join(reasons) if reasons else 'No suspicious patterns detected'})",
            )

    return render_template("url_scanner.html", url=url, risk=risk, reasons=reasons)


@app.route("/file-checker", methods=["GET", "POST"])
def file_checker():
    """Generate SHA256 hash for an uploaded file."""
    if not is_logged_in():
        return redirect(url_for("login"))

    hash_value = None
    filename = None

    if request.method == "POST":
        file = request.files.get("file")
        if file and file.filename:
            filename = file.filename
            file_bytes = file.read()
            hash_value = hashlib.sha256(file_bytes).hexdigest()

            save_scan_result(
                session["user_id"],
                "file_checker",
                filename,
                f"SHA256: {hash_value}",
            )
        else:
            flash("Please select a file to analyze.", "error")

    return render_template("file_checker.html", hash_value=hash_value, filename=filename)


# Ensure database is initialized when the app starts
init_db()

if __name__ == "__main__":
    # For development only. Use a WSGI server for production.
    app.run(host="0.0.0.0", port=5000, debug=True)
