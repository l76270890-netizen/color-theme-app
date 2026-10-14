from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import User, get_db, settings

AUTH_COOKIE_NAME = "huecraft_access_token"
_password_hash = PasswordHash.recommended()
_algorithm = "HS256"
router = APIRouter(prefix="/api/auth", tags=["authentication"])


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires_at},
        settings.jwt_secret_key,
        algorithm=_algorithm,
    )


def get_token_user_id(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[_algorithm])
        subject = payload.get("sub")
        return int(subject) if isinstance(subject, str) else None
    except (jwt.InvalidTokenError, ValueError):
        return None


def get_current_user(
    token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    user_id = get_token_user_id(token) if token else None
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to continue",
        )
    return user


class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name cannot be blank")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: str = Field(max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name cannot be blank")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        return value.strip()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str


def validate_browser_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin is not None and origin not in settings.cors_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request origin is not allowed",
        )


def set_auth_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=create_access_token(user_id),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/auth",
    )


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def sign_up(
    payload: SignUpRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    validate_browser_origin(request)
    existing_user = db.scalar(select(User).where(User.email == str(payload.email)))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name,
        email=str(payload.email),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from None
    db.refresh(user)
    set_auth_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserResponse)
def sign_in(
    payload: SignInRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    validate_browser_origin(request)
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect",
        )
    set_auth_cookie(response, user.id)
    return user


@router.get("/me", response_model=UserResponse)
def read_current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    payload: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    validate_browser_origin(request)
    normalized_email = str(payload.email)
    duplicate = db.scalar(
        select(User).where(User.email == normalized_email, User.id != user.id)
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email is already used by another account",
        )

    user.name = payload.name
    user.email = normalized_email
    user.role = payload.role
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email is already used by another account",
        ) from None
    db.refresh(user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(request: Request, response: Response) -> None:
    validate_browser_origin(request)
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/auth",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
