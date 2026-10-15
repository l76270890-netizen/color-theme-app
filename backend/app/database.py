from collections.abc import Generator

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    frontend_origins: str = "http://127.0.0.1:5173,http://localhost:5173,http://color-theme-app-xi.vercel.app  "
    cookie_secure: bool = False
    access_token_expire_minutes: int = Field(default=720, gt=0)
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Designer & developer",
    )


class WorkspacePreferences(Base):
    __tablename__ = "workspace_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="dark")
    sidebar_collapsed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    favorites: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    collections: Mapped[list[dict[str, object]]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: [{"id": "inspiration", "name": "Inspiration", "paletteIds": []}],
    )


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
