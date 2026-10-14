import os
import tempfile
from pathlib import Path
from uuid import uuid4

test_database_path = Path(tempfile.gettempdir()) / f"huecraft-auth-tests-{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_database_path.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters"
os.environ["FRONTEND_ORIGINS"] = "http://127.0.0.1:5173"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    yield
    engine.dispose()
    test_database_path.unlink(missing_ok=True)


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


def test_signup_sets_http_only_cookie_and_restores_user(client):
    response = client.post(
        "/api/auth/signup",
        json={"name": "  Alex Morgan  ", "email": "ALEX@example.com", "password": "correct-horse-123"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Alex Morgan"
    assert response.json()["email"] == "alex@example.com"
    assert "password" not in response.json()
    assert "password_hash" not in response.json()
    assert "httponly" in response.headers["set-cookie"].lower()

    current_user = client.get("/api/auth/me")
    assert current_user.status_code == 200
    assert current_user.json()["email"] == "alex@example.com"


def test_login_rejects_bad_password_and_accepts_valid_password(client):
    client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    client.post("/api/auth/logout")

    invalid_login = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "incorrect-password"},
    )
    assert invalid_login.status_code == 401

    valid_login = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert valid_login.status_code == 200


def test_profile_update_and_logout(client):
    client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )

    updated = client.patch(
        "/api/auth/me",
        json={"name": "Alex Morgan", "email": "alex@example.com", "role": "Artist"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Alex Morgan"
    assert updated.json()["role"] == "Artist"

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_signup_rejects_duplicate_email_and_untrusted_origin(client):
    payload = {"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    duplicate = client.post("/api/auth/signup", json=payload)
    assert duplicate.status_code == 409

    forbidden = client.post(
        "/api/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "correct-horse-123"},
        headers={"Origin": "https://malicious.example"},
    )
    assert forbidden.status_code == 403
