# CyberShield – Web Security Analyzer

A full-stack cybersecurity web project with user authentication, password strength analysis, phishing URL detection, and file integrity checking.

## Features

- User registration and login (passwords hashed using SHA256)
- Dashboard with navigation to security tools
- Password strength analyzer (length + character variety)
- Phishing URL detector (HTTPS + suspicious patterns)
- File integrity checker (SHA256 hash)
- Results stored in SQLite for auditing

## Getting Started

1. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the app:
   ```bash
   python app.py
   ```
4. Open a browser and go to http://127.0.0.1:5000

## Project Structure

- `app.py` – Flask backend and routes
- `database.db` – SQLite database (created automatically)
- `templates/` – HTML templates
- `static/css/` – Styling
- `static/js/` – Frontend JavaScript

## Notes

- For production, set a strong `CYBERSHIELD_SECRET_KEY` environment variable.
- Store and serve this project behind HTTPS for security.
