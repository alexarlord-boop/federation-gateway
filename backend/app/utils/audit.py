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
_PATH_RULES: list[tuple[str, str, str, str]] = [
    # (method, regex, action, resource_type)
    ("POST",   r"subordinates$",                   "register",      "subordinate"),
    ("PATCH",  r"subordinates/[^/]+$",             "update_status", "subordinate"),
    ("PUT",    r"subordinates/[^/]+$",             "update",        "subordinate"),
    ("DELETE", r"subordinates/[^/]+$",             "delete",        "subordinate"),
    ("POST",   r"trust-marks/issuance/specs$",     "create",        "trust_mark_spec"),
    ("PATCH",  r"trust-marks/issuance/specs/[^/]+$", "update",      "trust_mark_spec"),
    ("DELETE", r"trust-marks/issuance/specs/[^/]+$", "delete",      "trust_mark_spec"),
    ("POST",   r"trust-marks/issuance/subjects$",  "issue",         "trust_mark"),
    ("DELETE", r"trust-marks/issuance/subjects/[^/]+$", "revoke",   "trust_mark"),
    ("POST",   r"subordinates/[^/]+/jwks$",        "update_jwks",   "subordinate"),
    ("PUT",    r"subordinates/[^/]+/metadata$",    "update_metadata","subordinate"),
    ("PUT",    r"subordinates/[^/]+/constraints$", "update_constraints","subordinate"),
    ("PUT",    r"subordinates/[^/]+/policy$",      "update_policy", "subordinate"),
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
