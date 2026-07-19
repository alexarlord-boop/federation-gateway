"""
Maps a real proxied request (HTTP method + concrete path) back to the
(feature, operation) pair RBAC permissions are granted against.

Built from the same OpenAPI parse that seeds Permission rows in
rbac_seed.py, so the (feature, operation) vocabulary produced here always
matches what's actually stored — no separate hand-maintained mapping to
drift out of sync (see backend/app/utils/audit.py's _PATH_RULES for a
cautionary example: a hand-written table that only covers a fraction of
the real API surface).
"""
from __future__ import annotations

import re
import threading
from typing import Optional

from app.utils.openapi_parser import parse_openapi_spec

_PARAM_RE = re.compile(r"\{[^/}]+\}")


def _path_to_regex(path: str) -> "re.Pattern[str]":
    """"/admin/subordinates/{id}/status" -> ^/admin/subordinates/[^/]+/status$

    Splits on {param} placeholders first and escapes only the literal
    segments in between, so escaping never touches the braces themselves.
    """
    parts = _PARAM_RE.split(path)
    pattern_src = "^" + "[^/]+".join(re.escape(part) for part in parts) + "$"
    return re.compile(pattern_src)


_lock = threading.Lock()
_compiled: Optional[list[tuple[str, "re.Pattern[str]", str, str]]] = None


def _compile_endpoints() -> list[tuple[str, "re.Pattern[str]", str, str]]:
    parser = parse_openapi_spec()
    compiled = []
    for entry in parser.get_endpoint_operations():
        compiled.append((
            entry["method"],
            _path_to_regex(entry["path"]),
            entry["feature"],
            entry["operation"],
        ))
    return compiled


def _get_compiled() -> list[tuple[str, "re.Pattern[str]", str, str]]:
    global _compiled
    if _compiled is None:
        with _lock:
            if _compiled is None:
                _compiled = _compile_endpoints()
    return _compiled


def match_feature_operation(method: str, path: str) -> Optional[tuple[str, str]]:
    """
    Match a concrete request path (e.g. "api/v1/admin/subordinates/42/status",
    with or without a leading slash) against the OpenAPI spec's path
    templates for the given HTTP method.

    Returns (feature, operation) on match, or None if the path doesn't match
    any known endpoint (e.g. it's not yet in the spec, or a caller is probing
    something undocumented).
    """
    normalized = "/" + path.lstrip("/")
    method = method.upper()
    for entry_method, pattern, feature, operation in _get_compiled():
        if entry_method == method and pattern.match(normalized):
            return feature, operation
    return None
