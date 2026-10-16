import json
import os
import tempfile
from pathlib import Path
from uuid import uuid4

test_database_path = Path(tempfile.gettempdir()) / f"huecraft-workspace-tests-{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_database_path.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters"
os.environ["FRONTEND_ORIGINS"] = "http://127.0.0.1:5173"
os.environ["COOKIE_SECURE"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine, settings
from app.main import app
from app import ai_assistant


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
    assert client.post("/api/auth/logout").status_code == 204
    first_login = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert first_login.status_code == 200
    assert client.get("/api/workspace").json() == preferences


def test_login_session_cookie_survives_a_page_reload(client):
    signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert signup.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert login.status_code == 200
    assert "max-age=43200" in login.headers["set-cookie"].lower()
    assert client.get("/api/auth/me").json()["email"] == "alex@example.com"


def test_https_login_uses_cross_site_cookie_attributes(client, monkeypatch):
    monkeypatch.setattr(settings, "cookie_secure", True)
    signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )

    assert signup.status_code == 201
    cookie = signup.headers["set-cookie"].lower()
    assert "samesite=none" in cookie
    assert "secure" in cookie


def test_assistant_history_is_saved_and_scoped_to_each_account(client):
    first_signup = client.post(
        "/api/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert first_signup.status_code == 201

    entry = {
        "mode": "generate",
        "prompt": "A calm palette for a reading app",
        "answer": "Soft sea colors create a restful mood.",
        "palette": {
            "id": "generated",
            "name": "Quiet Tide",
            "description": "A serene set of sea-inspired shades.",
            "category": "AI generated",
            "mood": "Calm",
            "style": "Custom",
            "colors": ["#102030", "#234567", "#4680A0", "#A0C0D0", "#F0F0E0"],
            "keywords": [],
        },
    }
    saved = client.post(
        "/api/workspace/assistant-history",
        json=entry,
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert saved.status_code == 201
    assert saved.json()["prompt"] == entry["prompt"]
    assert saved.json()["palette"] == entry["palette"]
    assert client.get("/api/workspace/assistant-history").json() == [saved.json()]

    assert client.post("/api/auth/logout").status_code == 204
    second_signup = client.post(
        "/api/auth/signup",
        json={"name": "Sam", "email": "sam@example.com", "password": "correct-horse-456"},
    )
    assert second_signup.status_code == 201
    assert client.get("/api/workspace/assistant-history").json() == []

    assert client.post("/api/auth/logout").status_code == 204
    login = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "correct-horse-123"},
    )
    assert login.status_code == 200
    assert client.get("/api/workspace/assistant-history").json() == [saved.json()]


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


def test_ai_assistant_requires_a_backend_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", None)

    response = client.post(
        "/api/ai/chat",
        json={"mode": "generate", "prompt": "A calm ocean palette"},
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert response.status_code == 503
    assert response.json()["detail"].startswith("AI assistant is not configured")


def test_ai_assistant_generates_valid_five_color_palette(client, monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")
    monkeypatch.setattr(
        ai_assistant,
        "request_groq_reply",
        lambda *_: ai_assistant.AssistantModelReply.model_validate({
            "answer": "A muted palette with a bright accent.",
            "palette_name": "Ocean Glass",
            "palette_description": "Soft sea tones with a clear accent.",
            "colors": ["#102030", "#234567", "#4680A0", "#A0C0D0", "#F0C050"],
        }),
    )

    response = client.post(
        "/api/ai/chat",
        json={"mode": "generate", "prompt": "Calm ocean colors for a dashboard"},
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["mode"] == "generate"
    assert result["palette"]["name"] == "Ocean Glass"
    assert result["palette"]["colors"] == [
        "#102030",
        "#234567",
        "#4680A0",
        "#A0C0D0",
        "#F0C050",
    ]


def test_ai_assistant_recommends_only_a_submitted_huecraft_palette(client, monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")
    monkeypatch.setattr(
        ai_assistant,
        "request_groq_reply",
        lambda *_: ai_assistant.AssistantModelReply.model_validate({
            "answer": "Its calm greens fit a botanical shop.",
            "palette_id": "botanical-market",
        }),
    )
    palette = {
        "id": "botanical-market",
        "name": "Botanical Market",
        "description": "Fresh greens and market-day warmth",
        "category": "E-commerce",
        "mood": "Natural",
        "style": "Light",
        "colors": ["#F4F1E6", "#DCE3C4", "#A2B18A", "#647A58", "#354B3C"],
        "keywords": ["natural", "shop", "botanical"],
    }

    response = client.post(
        "/api/ai/chat",
        json={
            "mode": "recommend",
            "prompt": "A natural palette for an online shop",
            "palettes": [palette],
        },
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert response.status_code == 200
    assert response.json()["palette"] == palette


def test_ai_assistant_accepts_existing_palettes_with_six_or_seven_colors():
    colors = ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"]
    from app.ai_assistant import PaletteCandidate

    palette = PaletteCandidate(
        id="seven-color-palette",
        name="Seven Colors",
        description="Palette from the expanded Explore collection",
        category="Inspiration",
        mood="Bold",
        style="Vibrant",
        colors=colors,
        keywords=[],
    )

    assert len(palette.colors) == 7


def test_groq_request_uses_server_key_and_returns_assistant_reply(monkeypatch):
    import httpx

    monkeypatch.setattr(settings, "groq_api_key", "server-only-test-key")
    monkeypatch.setattr(settings, "groq_model", "test-model")
    response_content = {
        "answer": "Use a cool blue with a warm accent.",
        "palette_name": None,
        "palette_description": None,
        "colors": [],
        "palette_id": None,
    }
    upstream_response = {
        "choices": [{"message": {"content": json.dumps(response_content)}}]
    }
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return httpx.Response(200, json=upstream_response, request=httpx.Request("POST", url))

    client = httpx.Client()
    monkeypatch.setattr(client, "post", fake_post)
    reply = ai_assistant.request_groq_reply("Explain color contrast", client)

    assert reply.answer == response_content["answer"]
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer server-only-test-key"
    assert captured["json"]["model"] == "test-model"
    assert captured["json"]["reasoning_effort"] == "low"
    assert captured["json"]["max_completion_tokens"] == 384
    client.close()


def test_ai_assistant_rejects_prompts_over_limit(client):
    response = client.post(
        "/api/ai/chat",
        json={"mode": "ask", "prompt": "a" * 1001},
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert response.status_code == 422


def test_ai_assistant_rejects_invalid_palette_hex_values(client):
    response = client.post(
        "/api/ai/chat",
        json={
            "mode": "recommend",
            "prompt": "Find a match",
            "palettes": [{
                "id": "invalid",
                "name": "Invalid",
                "description": "Not a valid palette",
                "category": "Test",
                "mood": "Test",
                "style": "Test",
                "colors": ["not-hex", "#234567", "#4680A0", "#A0C0D0", "#F0C050"],
                "keywords": [],
            }],
        },
        headers={"Origin": "http://127.0.0.1:5173"},
    )

    assert response.status_code == 422
