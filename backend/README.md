# Huecraft backend

FastAPI authentication API backed by PostgreSQL. The React frontend stays in
`static/`; backend code and configuration live in `backend/`.

The backend is organized into a small set of files: `app/main.py` starts the
API, `app/database.py` contains settings and database models, `app/auth.py`
contains authentication routes and helpers, and `app/workspace.py` stores
signed-in workspace preferences.

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
   database, then writes generated credentials to the ignored `.env` file. If
   the `huecraft` database already exists, the script only adopts it when the
   `public` schema contains no tables, views, or sequences. It refuses to
   overwrite an existing `.env`, app role, or non-empty database.

   If `.env` already exists because you copied `.env.example`, move that file
   somewhere private outside the repository before running the setup script.
   The script generates a fresh `.env` for its own `huecraft` database and role.

3. Start the API from this directory:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   The users table is created on startup. Interactive API documentation is at
   `http://127.0.0.1:8000/docs`.

The frontend uses `http://127.0.0.1:8000` locally and defaults to the production
Railway API when built for production. For a different API address, set
`VITE_API_URL` in the frontend environment. Set `FRONTEND_ORIGINS` on the
backend to the exact frontend origin. For HTTPS deployments, set
`COOKIE_SECURE=true` and use a private JWT secret.

## AI assistant

The assistant uses Google's `google-genai` Python SDK from the backend to
generate palettes, recommend existing Huecraft palettes, and answer color
questions. Set `GEMINI_API_KEY` as a private backend environment variable
(for example, in Railway). Never put this key in Vercel's `VITE_*` variables or
frontend source. The backend optionally accepts `GEMINI_MODEL`; it defaults to
`gemini-2.5-flash`.

Transient provider errors (HTTP 429, 500, 502, 503, 504) are retried up to three
times per model with exponential backoff (about 1s, then 2s, plus jitter).
Other 4xx errors are not retried. If every attempt on `GEMINI_MODEL` fails with
a transient error, the backend tries `GEMINI_FALLBACK_MODEL` once more with the
same retry policy. It is optional and defaults to the value of `GEMINI_MODEL`,
which makes the fallback a no-op unless you configure a different model.


The provider's free-tier availability and quota depend on Google's current
terms and account. Requests are limited to 1,000 characters, and generated
palettes are checked for exactly five valid HEX colors.

For Render or similar platforms, the backend includes a `Procfile` that starts
FastAPI with Gunicorn and Uvicorn:

```text
web: gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

## Authentication endpoints

- `POST /api/auth/signup` — create an account and sign in.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — get the current account.
- `PATCH /api/auth/me` — update the current profile.
- `POST /api/auth/logout` — clear the session cookie.
- `GET /api/workspace` — get the signed-in user's theme, sidebar, favorites, and
  collections.
- `PUT /api/workspace` — save those workspace preferences to the signed-in user's
  account.
- `POST /api/ai/chat` — generate a palette, recommend a Huecraft palette, or ask
  a color question. The request `mode` is `generate`, `recommend`, or `ask`.

Workspace preferences are also cached in the browser for guest use. After
signing in, the account's saved preferences are restored and changes sync to the
backend.

Passwords are hashed with Argon2. Sessions use a short-lived, HTTP-only,
SameSite=Lax cookie; the browser does not store passwords or bearer tokens.

Run the backend tests from this directory with
`.venv\Scripts\python.exe -m pytest -q tests`. They use a temporary SQLite
database and do not connect to or change your PostgreSQL database.
