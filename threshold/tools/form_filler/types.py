from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class FormFillRequest(BaseModel):
    """Request to fill an online form."""

    url: str
    instructions: str
    form_data: dict[str, str]


class FormFillResult(BaseModel):
    """Result of a form-filling session."""

    status: Literal["completed", "failed", "blocked"]
    summary: str
    screenshot_base64: str | None = None
    fields_filled: dict[str, str]
