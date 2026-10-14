import os
import tempfile
from pathlib import Path
from uuid import uuid4

test_database_path = Path(tempfile.gettempdir()) / f"huecraft-workspace-tests-{uuid4().hex}.db"
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


def test_workspace_preferences_are_saved_per_account(client):
    assert client.get("/api/workspace").status_code == 401

    signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert signup.status_code == 201
    assert client.get("/api/workspace").json() == {
        "theme": "dark",
        "sidebarCollapsed": False,
        "favorites": [],
        "collections": [{"id": "inspiration", "name": "Inspiration", "paletteIds": []}],
    }

    preferences = {
        "theme": "light",
        "sidebarCollapsed": True,
        "favorites": ["deep-current"],
        "collections": [
            {"id": "inspiration", "name": "Inspiration", "paletteIds": []},
            {"id": "collection-1", "name": "Portfolio", "paletteIds": ["deep-current"]},
        ],
    }
    saved = client.put("/api/workspace", json=preferences)
    assert saved.status_code == 200
    assert saved.json() == preferences
    assert client.get("/api/workspace").json() == preferences

    assert client.post("/api/auth/logout").status_code == 204
    second_signup = client.post(
        "/api/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "correct-horse-456"},
    )
    assert second_signup.status_code == 201
    assert client.get("/api/workspace").json()["favorites"] == []


def test_workspace_rejects_invalid_theme(client):
    signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert signup.status_code == 201

    response = client.put(
        "/api/workspace",
        json={
            "theme": "system",
            "sidebarCollapsed": False,
            "favorites": [],
            "collections": [],
        },
    )
    assert response.status_code == 422


def test_workspace_rejects_untrusted_origin(client):
    signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert signup.status_code == 201

    response = client.put(
        "/api/workspace",
        json={
            "theme": "dark",
            "sidebarCollapsed": False,
            "favorites": [],
            "collections": [],
        },
        headers={"Origin": "https://malicious.example"},
    )
    assert response.status_code == 403
