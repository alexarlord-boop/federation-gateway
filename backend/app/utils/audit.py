"""Lightweight helper for writing audit log entries."""
from __future__ import annotations

import json
import re
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

# Patterns for deriving (action, resource_type) from proxy path + HTTP method.
# Checked in order; first match wins.
# Paths are matched against the raw proxy path (e.g. "api/v1/admin/subordinates/123/status").
_PATH_RULES: list[tuple[str, str, str, str]] = [
    # (method, regex, action, resource_type)

    # ── Subordinates ──────────────────────────────────────────────────────────
    ("POST",   r"subordinates$",                              "register",           "subordinate"),
    ("PUT",    r"subordinates/[^/]+/status$",                  "update_status",      "subordinate"),
    ("DELETE", r"subordinates/[^/]+$",                        "delete",             "subordinate"),
    # JWKS
    ("POST",   r"subordinates/[^/]+/jwks$",                   "update_jwks",        "subordinate"),
    ("DELETE", r"subordinates/[^/]+/jwks/[^/]+$",             "delete_jwks_key",    "subordinate"),
    # Per-subordinate metadata / constraints / policies
    ("PUT",    r"subordinates/[^/]+/metadata/[^/]+/[^/]+$",   "update_metadata",    "subordinate"),
    ("DELETE", r"subordinates/[^/]+/metadata/[^/]+/[^/]+$",   "delete_metadata",    "subordinate"),
    ("PUT",    r"subordinates/[^/]+/constraints$",            "update_constraints", "subordinate"),
    ("PUT",    r"subordinates/[^/]+/constraints/[^/]+$",      "update_constraints", "subordinate"),
    ("DELETE", r"subordinates/[^/]+/constraints/[^/]+$",      "delete_constraint",  "subordinate"),
    ("POST",   r"subordinates/[^/]+/metadata-policies",       "update_policy",      "subordinate"),
    ("PUT",    r"subordinates/[^/]+/metadata-policies",       "update_policy",      "subordinate"),
    ("DELETE", r"subordinates/[^/]+/metadata-policies",       "delete_policy",      "subordinate"),
    # Per-subordinate additional claims
    ("POST",   r"subordinates/[^/]+/additional-claims$",      "add_claim",          "subordinate"),
    ("PUT",    r"subordinates/[^/]+/additional-claims/[^/]+$","update_claim",       "subordinate"),
    ("DELETE", r"subordinates/[^/]+/additional-claims/[^/]+$","delete_claim",       "subordinate"),

    # ── Trust mark issuance specs (path: …/issuance-spec) ────────────────────
    ("POST",   r"trust-marks/issuance-spec$",                 "create",             "trust_mark_spec"),
    ("PATCH",  r"trust-marks/issuance-spec/[^/]+$",           "update",             "trust_mark_spec"),
    ("DELETE", r"trust-marks/issuance-spec/[^/]+$",           "delete",             "trust_mark_spec"),
    # Trust mark subjects
    ("POST",   r"trust-marks/issuance-spec/[^/]+/subjects$",  "issue",              "trust_mark"),
    ("PUT",    r"trust-marks/issuance-spec/[^/]+/subjects/[^/]+/status$", "update_status", "trust_mark"),
    ("DELETE", r"trust-marks/issuance-spec/[^/]+/subjects/[^/]+$", "revoke",        "trust_mark"),
]


def classify_proxy_request(method: str, path: str) -> tuple[str, str] | None:
    """Return (action, resource_type) for a proxy path, or None if unrecognised."""
    for rule_method, pattern, action, resource_type in _PATH_RULES:
        if method.upper() == rule_method and re.search(pattern, path.lstrip("/")):
            return action, resource_type
    return None


def record(
    db: Session,
    *,
    user_id: str,
    user_email: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    details: Optional[Any] = None,
) -> AuditLog:
    entry = AuditLog(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if details is not None else None,
    )
    db.add(entry)
    db.commit()
    return entry
