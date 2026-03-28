from __future__ import annotations

import os
import sqlite3

from langgraph.checkpoint.sqlite import SqliteSaver

DB_PATH = os.path.join(os.getenv("THRESHOLD_DATA_DIR", "./data"), "checkpoints.db")


def get_checkpointer() -> SqliteSaver:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    return SqliteSaver(conn)
