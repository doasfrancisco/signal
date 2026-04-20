"""FastAPI auth dependency — validates x-api-key header vs SIGNAL_API_KEY env var."""
import os

from fastapi import Header, HTTPException


def require_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("SIGNAL_API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(401, "unauthorized")
