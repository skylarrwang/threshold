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
    # Migrate existing tables to add new columns
    _migrate_columns = [
        ("document_upload", "raw_extraction TEXT"),
        ("document_upload", "mapped_fields TEXT"),
        ("document_upload", "file_path VARCHAR"),
        ("document_upload", "mime_type VARCHAR"),
        # UserIdentity additions for profile unification
        ("user_identity", "first_name VARCHAR"),
        ("user_identity", "last_name VARCHAR"),
        ("user_identity", "city VARCHAR"),
        ("user_identity", "zip_code VARCHAR"),
        ("user_identity", "email VARCHAR"),
        ("user_identity", "height VARCHAR"),
        ("user_identity", "eye_color VARCHAR"),
        ("user_identity", "gender VARCHAR"),
        ("user_identity", "age_range VARCHAR"),
        ("user_identity", "release_date VARCHAR"),
        ("user_identity", "time_served VARCHAR"),
        ("user_identity", "offense_category VARCHAR"),
        # UserPreferences addition
        ("user_preferences", "immediate_needs TEXT DEFAULT '[]'"),
    ]
    with _engine.connect() as conn:
        for table, col in _migrate_columns:
            try:
                conn.execute(
                    __import__("sqlalchemy").text(
                        f"ALTER TABLE {table} ADD COLUMN {col}"
                    )
                )
                conn.commit()
            except Exception:
                conn.rollback()


def get_db() -> Session:
    """Get a new database session. Caller is responsible for closing."""
    _ensure_engine()
    init_db()
    return _SessionLocal()
