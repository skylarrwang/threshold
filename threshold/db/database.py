from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from .models import Base

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
DB_PATH = DATA_DIR / "threshold.db"


def _get_engine():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{DB_PATH}",
        connect_args={"check_same_thread": False},
    )
    # WAL mode for better concurrent read performance
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


_engine = None
_SessionLocal = None


def _ensure_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = _get_engine()
        _SessionLocal = sessionmaker(bind=_engine)


def init_db() -> None:
    """Create all tables if they don't exist."""
    _ensure_engine()
    Base.metadata.create_all(_engine)


def get_db() -> Session:
    """Get a new database session. Caller is responsible for closing."""
    _ensure_engine()
    init_db()
    return _SessionLocal()
