from contextlib import asynccontextmanager
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai_assistant import router as ai_router
from app.auth import router as auth_router
from app.database import Base, engine, settings
from app.workspace import router as workspace_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    app.state.groq_client = httpx.Client(
        timeout=httpx.Timeout(20.0, connect=5.0),
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
    )
    try:
        Base.metadata.create_all(bind=engine)
        yield
    finally:
        app.state.groq_client.close()


app = FastAPI(title="Huecraft API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(ai_router)
