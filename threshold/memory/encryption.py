from __future__ import annotations

import json
import os
from pathlib import Path

from cryptography.fernet import Fernet


def get_fernet() -> Fernet:
    key = os.getenv("THRESHOLD_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "THRESHOLD_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_file(data: dict, path: Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    plaintext = json.dumps(data, default=str).encode()
    ciphertext = get_fernet().encrypt(plaintext)
    path.write_bytes(ciphertext)


def decrypt_file(path: Path) -> dict:
    path = Path(path)
    ciphertext = path.read_bytes()
    plaintext = get_fernet().decrypt(ciphertext)
    return json.loads(plaintext)
