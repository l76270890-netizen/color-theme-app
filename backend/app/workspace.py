from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, validate_browser_origin
from app.database import AssistantHistoryMessage, User, WorkspacePreferences, get_db

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

DEFAULT_COLLECTIONS = [{"id": "inspiration", "name": "Inspiration", "paletteIds": []}]


class CollectionPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    palette_ids: list[str] = Field(alias="paletteIds", max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Collection names cannot be blank")
        return normalized


class WorkspacePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    theme: Literal["dark", "light"]
    sidebar_collapsed: bool = Field(alias="sidebarCollapsed")
    favorites: list[str] = Field(max_length=1000)
    collections: list[CollectionPayload] = Field(max_length=100)


class AssistantHistoryPalette(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(max_length=300)
    category: str = Field(max_length=80)
    mood: str = Field(max_length=80)
    style: str = Field(max_length=80)
    colors: list[str] = Field(min_length=5, max_length=7)
    keywords: list[str] = Field(max_length=30)


class AssistantHistoryEntry(BaseModel):
    id: str
    mode: Literal["generate", "recommend", "ask"]
    prompt: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=2000)
    palette: AssistantHistoryPalette | None = None


class AssistantHistoryRequest(BaseModel):
    mode: Literal["generate", "recommend", "ask"]
    prompt: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=2000)
    palette: AssistantHistoryPalette | None = None


MAX_ASSISTANT_HISTORY = 100


def read_workspace(preferences: WorkspacePreferences | None) -> WorkspacePayload:
    if preferences is None:
        return WorkspacePayload(
            theme="dark",
            sidebarCollapsed=False,
            favorites=[],
            collections=DEFAULT_COLLECTIONS,
        )
    return WorkspacePayload(
        theme=preferences.theme,
        sidebarCollapsed=preferences.sidebar_collapsed,
        favorites=preferences.favorites,
        collections=preferences.collections,
    )


@router.get("", response_model=WorkspacePayload)
def get_workspace(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspacePayload:
    return read_workspace(db.get(WorkspacePreferences, user.id))


@router.put("", response_model=WorkspacePayload)
def save_workspace(
    payload: WorkspacePayload,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspacePayload:
    validate_browser_origin(request)
    preferences = db.get(WorkspacePreferences, user.id)
    if preferences is None:
        preferences = WorkspacePreferences(user_id=user.id)
        db.add(preferences)

    preferences.theme = payload.theme
    preferences.sidebar_collapsed = payload.sidebar_collapsed
    preferences.favorites = payload.favorites
    preferences.collections = [
        collection.model_dump(by_alias=True) for collection in payload.collections
    ]
    db.commit()
    db.refresh(preferences)
    return read_workspace(preferences)


@router.get("/assistant-history", response_model=list[AssistantHistoryEntry])
def get_assistant_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssistantHistoryEntry]:
    records = db.scalars(
        select(AssistantHistoryMessage)
        .where(AssistantHistoryMessage.user_id == user.id)
        .order_by(AssistantHistoryMessage.created_at, AssistantHistoryMessage.id)
        .limit(MAX_ASSISTANT_HISTORY)
    )
    return [
        AssistantHistoryEntry(
            id=record.id,
            mode=record.mode,
            prompt=record.prompt,
            answer=record.answer,
            palette=record.palette,
        )
        for record in records
    ]


@router.post(
    "/assistant-history",
    response_model=AssistantHistoryEntry,
    status_code=201,
)
def save_assistant_history(
    payload: AssistantHistoryRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantHistoryEntry:
    validate_browser_origin(request)
    entry_id = str(uuid4())
    record = AssistantHistoryMessage(
        id=entry_id,
        user_id=user.id,
        mode=payload.mode,
        prompt=payload.prompt,
        answer=payload.answer,
        palette=payload.palette.model_dump() if payload.palette else None,
    )
    db.add(record)
    db.flush()

    stale_records = db.scalars(
        select(AssistantHistoryMessage)
        .where(AssistantHistoryMessage.user_id == user.id)
        .order_by(
            AssistantHistoryMessage.created_at.desc(),
            AssistantHistoryMessage.id.desc(),
        )
        .offset(MAX_ASSISTANT_HISTORY)
    )
    for stale_record in stale_records:
        db.delete(stale_record)

    db.commit()
    return AssistantHistoryEntry(
        id=entry_id,
        mode=payload.mode,
        prompt=payload.prompt,
        answer=payload.answer,
        palette=payload.palette,
    )
