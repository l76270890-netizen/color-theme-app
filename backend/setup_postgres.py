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
    database_owner_changed = False
    previous_database_owner: str | None = None

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

                cursor.execute(
                    """
                    SELECT role_info.rolname
                    FROM pg_database AS db_info
                    JOIN pg_roles AS role_info ON role_info.oid = db_info.datdba
                    WHERE db_info.datname = %s
                    """,
                    (DATABASE_NAME,),
                )
                existing_database = cursor.fetchone()
                if existing_database:
                    previous_database_owner = existing_database[0]
                    with psycopg.connect(
                        host="127.0.0.1",
                        port=5432,
                        dbname=DATABASE_NAME,
                        user=admin_user,
                        password=admin_password,
                        connect_timeout=5,
                    ) as database_connection:
                        with database_connection.cursor() as database_cursor:
                            database_cursor.execute(
                                """
                                SELECT EXISTS (
                                    SELECT 1
                                    FROM pg_class AS relation_info
                                    JOIN pg_namespace AS namespace_info
                                      ON namespace_info.oid = relation_info.relnamespace
                                    WHERE namespace_info.nspname = 'public'
                                      AND relation_info.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
                                )
                                """
                            )
                            if database_cursor.fetchone()[0]:
                                raise RuntimeError(
                                    f"Database '{DATABASE_NAME}' contains existing objects; "
                                    "refusing to adopt it."
                                )

                cursor.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD {}").format(
                        sql.Identifier(APP_ROLE),
                        sql.Literal(app_password),
                    )
                )
                role_created = True
                if existing_database:
                    cursor.execute(
                        sql.SQL("ALTER DATABASE {} OWNER TO {}").format(
                            sql.Identifier(DATABASE_NAME),
                            sql.Identifier(APP_ROLE),
                        )
                    )
                    database_owner_changed = True
                else:
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
                "FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://color-theme-app-xi.vercel.app",
                "COOKIE_SECURE=false",
                "GEMINI_API_KEY=",
                "GEMINI_MODEL=gemini-2.5-flash",
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
                        elif database_owner_changed and previous_database_owner:
                            cursor.execute(
                                sql.SQL("ALTER DATABASE {} OWNER TO {}").format(
                                    sql.Identifier(DATABASE_NAME),
                                    sql.Identifier(previous_database_owner),
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
