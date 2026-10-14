# Huecraft backend

FastAPI authentication API backed by PostgreSQL. The React frontend stays in
`static/`; backend code and configuration live in `backend/`.

The backend keeps its application code in three files: `app/main.py` starts
the API, `app/database.py` contains settings and database models, and
`app/auth.py` contains authentication routes and helpers.

## Local setup

1. Create and activate a virtual environment, then install the dependencies:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

   For the backend test suite, install `requirements-dev.txt` instead.

2. From this directory, create the database and private app credentials:

   ```powershell
   .\.venv\Scripts\python.exe .\setup_postgres.py
   ```

   Enter your local PostgreSQL administrator username and password when prompted.
   The password prompt is hidden; the script creates a dedicated app role and
   database, then writes generated credentials to the ignored `.env` file. It
   refuses to overwrite an existing `.env`, database, or app role.

3. Start the API from this directory:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   The users table is created on startup. Interactive API documentation is at
   `http://127.0.0.1:8000/docs`.

The frontend expects the API at `http://127.0.0.1:8000`. For a different API
address, set `VITE_API_URL` in the frontend environment. Set `FRONTEND_ORIGINS`
to the exact frontend origin. For HTTPS deployments, set `COOKIE_SECURE=true`
and use a private JWT secret.

## Authentication endpoints

- `POST /api/auth/signup` — create an account and sign in.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — get the current account.
- `PATCH /api/auth/me` — update the current profile.
- `POST /api/auth/logout` — clear the session cookie.

Passwords are hashed with Argon2. Sessions use a short-lived, HTTP-only,
SameSite=Lax cookie; the browser does not store passwords or bearer tokens.

Run the authentication tests from this directory with
`.venv\Scripts\python.exe -m pytest -q tests`. They use a temporary SQLite
database and do not connect to or change your PostgreSQL database.
