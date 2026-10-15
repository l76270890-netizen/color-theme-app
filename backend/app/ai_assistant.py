import json
import logging
import re
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field, ValidationError, field_validator

from app.auth import validate_browser_origin
from app.database import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI assistant"])
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


class PaletteCandidate(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(max_length=300)
    category: str = Field(max_length=80)
    mood: str = Field(max_length=80)
    style: str = Field(max_length=80)
    colors: list[str] = Field(min_length=5, max_length=5)
    keywords: list[str] = Field(max_length=30)

    @field_validator("colors")
    @classmethod
    def validate_colors(cls, colors: list[str]) -> list[str]:
        if any(not HEX_COLOR_PATTERN.fullmatch(color) for color in colors):
            raise ValueError("Palette colors must be six-digit HEX values")
        return colors


class AssistantRequest(BaseModel):
    mode: Literal["generate", "recommend", "ask"]
    prompt: str = Field(min_length=1, max_length=1000)
    palettes: list[PaletteCandidate] = Field(default_factory=list, max_length=50)

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, prompt: str) -> str:
        normalized = prompt.strip()
        if not normalized:
            raise ValueError("Prompt cannot be blank")
        return normalized


class GeminiReply(BaseModel):
    answer: str = Field(min_length=1, max_length=2000)
    palette_name: str | None = Field(default=None, max_length=100)
    palette_description: str | None = Field(default=None, max_length=300)
    colors: list[str] = Field(default_factory=list, max_length=5)
    palette_id: str | None = Field(default=None, max_length=100)

    @field_validator("colors")
    @classmethod
    def validate_colors(cls, colors: list[str]) -> list[str]:
        if any(not HEX_COLOR_PATTERN.fullmatch(color) for color in colors):
            raise ValueError("Generated colors must be six-digit HEX values")
        return [color.upper() for color in colors]


class PaletteResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    mood: str
    style: str
    colors: list[str]
    keywords: list[str]


class AssistantResponse(BaseModel):
    mode: Literal["generate", "recommend", "ask"]
    answer: str
    palette: PaletteResponse | None = None


def build_model_prompt(payload: AssistantRequest) -> str:
    if payload.mode == "generate":
        instruction = (
            "Generate an original, practical five-color palette for this brief. "
            "Return a concise explanation in answer, a memorable palette_name, "
            "palette_description, and exactly five distinct six-digit HEX colors."
        )
    elif payload.mode == "recommend":
        instruction = (
            "Choose the single best matching palette from the supplied Huecraft "
            "palettes. Return its exact palette_id and explain the match in answer. "
            "Do not create or alter a palette."
        )
    else:
        instruction = (
            "Answer the user's question about color theory, color combinations, "
            "or contrast accurately and concisely. Do not create a palette."
        )

    prompt_parts = [instruction, f"User brief or question: {payload.prompt}"]
    if payload.mode == "recommend":
        prompt_parts.append(
            "Available Huecraft palettes (select only from these): "
            + json.dumps(
                [palette.model_dump() for palette in payload.palettes],
                ensure_ascii=True,
            )
        )
    return "\n\n".join(prompt_parts)


@router.post("/chat", response_model=AssistantResponse)
def chat_with_assistant(
    payload: AssistantRequest,
    request: Request,
) -> AssistantResponse:
    validate_browser_origin(request)
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assistant is not configured. Set GEMINI_API_KEY on the backend.",
        )
    if payload.mode == "recommend" and not payload.palettes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide Huecraft palettes to get a recommendation.",
        )

    try:
        response = genai.Client(api_key=settings.gemini_api_key).models.generate_content(
            model=settings.gemini_model,
            contents=build_model_prompt(payload),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiReply,
                temperature=0.4,
            ),
        )
    except errors.APIError as error:
        logger.exception("Gemini request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider could not complete the request. Check its key and quota.",
        ) from error

    try:
        reply = GeminiReply.model_validate_json(response.text or "")
    except (ValidationError, ValueError) as error:
        logger.exception("Gemini returned an invalid assistant response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider returned an invalid response. Please try again.",
        ) from error

    if payload.mode == "generate":
        if not reply.palette_name or not reply.palette_description or len(reply.colors) != 5:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI provider did not return a complete five-color palette.",
            )
        palette = PaletteResponse(
            id="generated",
            name=reply.palette_name,
            description=reply.palette_description,
            category="AI generated",
            mood="Custom",
            style="Custom",
            colors=reply.colors,
            keywords=[],
        )
        return AssistantResponse(mode=payload.mode, answer=reply.answer, palette=palette)

    if payload.mode == "recommend":
        selected = next(
            (palette for palette in payload.palettes if palette.id == reply.palette_id),
            None,
        )
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI provider did not select a valid Huecraft palette.",
            )
        return AssistantResponse(
            mode=payload.mode,
            answer=reply.answer,
            palette=PaletteResponse(**selected.model_dump()),
        )

    return AssistantResponse(mode=payload.mode, answer=reply.answer)
