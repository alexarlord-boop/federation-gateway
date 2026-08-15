"""
Crypto helpers for constructing spec-compliant Trust Mark Delegation JWTs
(OIDF Federation 1.0 §7.2).

LightHouse's admin API has no endpoint to mint a delegation JWT on an
owner's behalf, and never exposes any instance's real private key (checked
Federation Admin OpenAPI.yaml) — by design, delegation JWTs are produced
by whoever controls the owner's key material, outside LightHouse entirely.
So test_trust_mark_delegation.py fabricates a standalone owner identity
(throwaway EC keypair) and signs it here, then registers the owner's
*public* jwks with LightHouse the normal way
(LightHouseAdmin.create_trust_mark_owner — entity_id + jwks, no live
server required, same as registering any subordinate with a fabricated
identity).

Claim shape (`iss`/`sub`/`trust_mark_type`/`iat`/`exp`) and the
`trust-mark-delegation+jwt` typ header were confirmed by inspecting
go-oidfed/lib's DelegationJWT struct and parseDelegationJWT — not guessed.
"""
from __future__ import annotations

import base64
import time
from typing import Any

from cryptography.hazmat.primitives.asymmetric import ec
from jose import jws

DELEGATION_JWT_TYP = "trust-mark-delegation+jwt"


def _b64url(n: int, length: int = 32) -> str:
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


def generate_owner_keypair(kid: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """Returns (public_jwk, private_jwk) for a fresh P-256 keypair."""
    priv = ec.generate_private_key(ec.SECP256R1())
    pub_numbers = priv.public_key().public_numbers()
    public_jwk = {
        "kty": "EC",
        "crv": "P-256",
        "kid": kid,
        "x": _b64url(pub_numbers.x),
        "y": _b64url(pub_numbers.y),
        "alg": "ES256",
        "use": "sig",
    }
    private_jwk = dict(public_jwk, d=_b64url(priv.private_numbers().private_value))
    return public_jwk, private_jwk


def sign_delegation_jwt(
    private_jwk: dict[str, Any],
    owner_entity_id: str,
    issuer_entity_id: str,
    trust_mark_type: str,
    lifetime: int = 86400,
) -> str:
    now = int(time.time())
    payload = {
        "iss": owner_entity_id,
        "sub": issuer_entity_id,
        "trust_mark_type": trust_mark_type,
        "iat": now,
        "exp": now + lifetime,
    }
    return jws.sign(
        payload,
        private_jwk,
        algorithm="ES256",
        headers={"typ": DELEGATION_JWT_TYP, "kid": private_jwk["kid"]},
    )
