from getpass import getpass
from pathlib import Path
import secrets
import sys
from urllib.parse import quote

import psycopg
from psycopg import sql


BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"
DATABASE_NAME = "huecraft"
APP_ROLE = "huecraft_app"


def main() -> None:
    if ENV_FILE.exists():
        raise SystemExit(
            f"{ENV_FILE} already exists. It was left unchanged; remove or back it up "
            "before running setup again."
        )

    admin_user = input("PostgreSQL administrator [postgres]: ").strip() or "postgres"
    admin_password = getpass("PostgreSQL administrator password: ")
    if not admin_password:
        raise SystemExit("An administrator password is required.")

    app_password = secrets.token_urlsafe(32)
    jwt_secret = secrets.token_urlsafe(48)
    role_created = False
    database_created = False

    try:
        with psycopg.connect(
            host="127.0.0.1",
            port=5432,
            dbname="postgres",
            user=admin_user,
            password=admin_password,
            connect_timeout=5,
            autocommit=True,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (APP_ROLE,))
                if cursor.fetchone():
                    raise RuntimeError(
                        f"PostgreSQL role '{APP_ROLE}' already exists; refusing to change it."
                    )

                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DATABASE_NAME,))
                if cursor.fetchone():
                    raise RuntimeError(
                        f"Database '{DATABASE_NAME}' already exists; refusing to modify it."
                    )

                cursor.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD {}").format(
                        sql.Identifier(APP_ROLE),
                        sql.Literal(app_password),
                    )
                )
                role_created = True
                cursor.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(DATABASE_NAME),
                        sql.Identifier(APP_ROLE),
                    )
                )
                database_created = True

        database_url = (
            f"postgresql+psycopg://{APP_ROLE}:{quote(app_password, safe='')}"
            f"@127.0.0.1:5432/{DATABASE_NAME}"
        )
        env_contents = "\n".join(
            [
                f"DATABASE_URL={database_url}",
                f"JWT_SECRET_KEY={jwt_secret}",
                "FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173",
                "COOKIE_SECURE=false",
                "",
            ]
        )
        with ENV_FILE.open("x", encoding="utf-8", newline="\n") as env_file:
            env_file.write(env_contents)
    except (OSError, psycopg.Error, RuntimeError) as error:
        if role_created or database_created:
            try:
                with psycopg.connect(
                    host="127.0.0.1",
                    port=5432,
                    dbname="postgres",
                    user=admin_user,
                    password=admin_password,
                    connect_timeout=5,
                    autocommit=True,
                ) as connection:
                    with connection.cursor() as cursor:
                        if database_created:
                            cursor.execute(
                                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                                    sql.Identifier(DATABASE_NAME)
                                )
                            )
                        if role_created:
                            cursor.execute(
                                sql.SQL("DROP ROLE IF EXISTS {}").format(
                                    sql.Identifier(APP_ROLE)
                                )
                            )
            except psycopg.Error as cleanup_error:
                print(f"Setup cleanup failed: {cleanup_error}", file=sys.stderr)
        raise SystemExit(f"PostgreSQL setup failed: {error}") from error

    print("PostgreSQL database and application role created.")
    print("Generated backend/.env without displaying its secrets.")
    print("Start the API with:")
    print(r".\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000")


if __name__ == "__main__":
    main()
