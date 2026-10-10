import os
from typing import Iterator

from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from .database import SessionLocal


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_write_access(x_api_key: str | None = Header(default=None)) -> None:
    """If API_KEY is set in the environment, write endpoints need a matching X-API-Key header.
    With no API_KEY set (the default for the demo) writes are open."""
    expected = os.getenv("API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")
