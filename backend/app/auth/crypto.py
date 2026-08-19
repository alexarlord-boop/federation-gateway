"""Symmetric encryption for secrets stored at rest (OIDC client secrets).

Closes the TODO left on OIDCProvider.client_secret ("Stored plaintext for
dev; encrypt with Fernet env key for prod"). Fails closed: with no
OIDC_ENCRYPTION_KEY set, callers get a clear error instead of the secret
silently landing in the DB as plaintext.
"""

from __future__ import annotations

import os

from cryptography.fernet import Fernet, InvalidToken


class OIDCEncryptionNotConfigured(RuntimeError):
    pass


def _get_fernet() -> Fernet:
    key = os.getenv("OIDC_ENCRYPTION_KEY")
    if not key:
        raise OIDCEncryptionNotConfigured(
            "OIDC_ENCRYPTION_KEY is not set — cannot store or read OIDC "
            "client secrets. Generate one with "
            "`python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"` and set it in the "
            "backend's environment."
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise OIDCEncryptionNotConfigured(
            "Stored OIDC client secret could not be decrypted — "
            "OIDC_ENCRYPTION_KEY may have changed since it was stored."
        ) from exc
