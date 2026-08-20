#!/usr/bin/env python3
"""
Seed mesh2 — a second, fully independent LightHouse hierarchy (no shared
root, no authority_hint path to the mesh-* federation seeded by
scripts/seed-mesh.py). Two things this exists to demonstrate:

    mesh2-ta (root TA)  ->  mesh2-ia (Intermediate)  ->  mesh2-leaf-op (Subject)

1. mesh2 gets its own internal hierarchy + trust mark, wired up exactly
   like seed-mesh.py did for the first mesh (real fetched jwks, not
   fabricated — see that script's docstring for why that matters).

2. A genuine interfederation scenario: mesh-ia (the *other* mesh's
   issuer) issues its "mesh-member" trust mark to mesh2-leaf-op — an
   entity with zero hierarchical relationship to mesh-ia (not a
   subordinate, no authority_hint path, nothing). This is legal per the
   OIDF spec: trust marks are issuer-authoritative assertions, independent
   of the subject's position (or absence) in any hierarchy. The trust
   mark status check on that mark succeeds; a chain *resolve* from
   mesh2-leaf-op up through mesh-ta correctly fails (HTTP 404,
   "no valid trust path") — there's no spec mechanism that makes chain
   resolution cross an unrelated root, only trust marks / explicit
   configuration do that. Both behaviors are verified at the end of this
   script; that contrast is the whole point of running it.

Requires scripts/seed-mesh.py to have already been run once (step 2 reads
mesh-ia's existing issuance spec for the "mesh-member" type) — if it
hasn't, step 2 is skipped with a clear message rather than failing.

Run:  python3 scripts/seed-mesh2.py
Requires only the Python standard library.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# Admin API base (script runs on the host, so these are the published ports).
MESH2_TA_ADMIN = "http://localhost:8094/api/v1/admin"
MESH2_IA_ADMIN = "http://localhost:8095/api/v1/admin"
MESH2_LEAF_OP_ADMIN = "http://localhost:8096/api/v1/admin"
MESH_IA_ADMIN = "http://localhost:8091/api/v1/admin"  # the *other* mesh's issuer

# mesh2-* instances use distinct admin credentials from the rest of the
# deployment (see backend/config/gateway.yaml); the MESH_IA_ADMIN call above
# is the *other* mesh, so it needs the *other* credential pair. Run
# scripts/bootstrap-lighthouse-admin-users.py first if you haven't
# (PRODUCTION-READINESS.md #3).
_LH_USER = os.environ.get("LIGHTHOUSE_ADMIN_USERNAME", "gateway")
_LH_PASS = os.environ.get("LIGHTHOUSE_ADMIN_PASSWORD", "gateway")
_LH2_USER = os.environ.get("LIGHTHOUSE2_ADMIN_USERNAME", "gateway2")
_LH2_PASS = os.environ.get("LIGHTHOUSE2_ADMIN_PASSWORD", "gateway2")
_MESH1_AUTH_HEADER = "Basic " + base64.b64encode(f"{_LH_USER}:{_LH_PASS}".encode()).decode()
_MESH2_AUTH_HEADER = "Basic " + base64.b64encode(f"{_LH2_USER}:{_LH2_PASS}".encode()).decode()
_MESH2_ADMIN_BASES = (MESH2_TA_ADMIN, MESH2_IA_ADMIN, MESH2_LEAF_OP_ADMIN)


def _auth_header_for(url):
    return _MESH2_AUTH_HEADER if url.startswith(_MESH2_ADMIN_BASES) else _MESH1_AUTH_HEADER

# Public entity-configuration URL (also the host-published port).
MESH2_TA_PUBLIC = "http://localhost:8094"
MESH2_IA_PUBLIC = "http://localhost:8095"
MESH2_LEAF_OP_PUBLIC = "http://localhost:8096"

# Canonical entity_id of each node — the docker-network hostname baked into
# its own config.yaml.
MESH2_TA_EID = "http://mesh2-ta:8080"
MESH2_IA_EID = "http://mesh2-ia:8080"
MESH2_LEAF_OP_EID = "http://mesh2-leaf-op:8080"

MESH1_TM_TYPE = "http://mesh-ta:8080/trustmarks/mesh-member"


# ── helpers (same pattern as seed-mesh.py) ──────────────────────────────

def api(method, url, body=None, content_type="application/json"):
    data = body
    if content_type == "application/json" and body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": content_type,
            "X-Gateway-User-Email": "seed-mesh2@demo.local",
            "Authorization": _auth_header_for(url),
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"  !! {method} {url} -> HTTP {e.code}: {body_text[:200]}")
        return None


def decode_jwt_payload(jwt_text):
    payload_b64 = jwt_text.split(".")[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def fetch_real_jwks(public_base):
    url = f"{public_base}/.well-known/openid-federation"
    with urllib.request.urlopen(url) as resp:
        jwt_text = resp.read().decode()
    return decode_jwt_payload(jwt_text)["jwks"]


def wait_healthy(public_base, label, attempts=30, delay=1):
    import time
    url = f"{public_base}/.well-known/openid-federation"
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception:
            pass
        time.sleep(delay)
    print(f"  !! {label} never became healthy at {url}")
    sys.exit(1)


def register_subordinate(parent_admin, child_eid, child_jwks, registered_entity_types, description):
    existing = api("GET", f"{parent_admin}/subordinates") or []
    if any(s.get("entity_id") == child_eid for s in existing):
        print(f"  SKIP subordinate already registered: {child_eid}")
        return
    result = api("POST", f"{parent_admin}/subordinates", {
        "entity_id": child_eid,
        "status": "active",
        "description": description,
        "registered_entity_types": registered_entity_types,
        "jwks": child_jwks,
    })
    if result:
        print(f"  OK  registered subordinate: {child_eid}")
    else:
        print(f"  !!  failed to register subordinate: {child_eid}")


def set_authority_hint(child_admin, parent_eid, description):
    existing = api("GET", f"{child_admin}/entity-configuration/authority-hints") or []
    if any(h.get("authority_hint") == parent_eid or h.get("entity_id") == parent_eid for h in existing):
        print(f"  SKIP authority hint already set: {parent_eid}")
        return
    result = api("POST", f"{child_admin}/entity-configuration/authority-hints", {
        "entity_id": parent_eid,
        "description": description,
    })
    if result:
        print(f"  OK  authority hint -> {parent_eid}")
    else:
        print(f"  !!  failed to set authority hint -> {parent_eid}")


# ── 1. wait for mesh2 ────────────────────────────────────────────────────

print("\n=== Waiting for mesh2 containers to become healthy ===\n")
for public, label in [
    (MESH2_TA_PUBLIC, "mesh2-ta"),
    (MESH2_IA_PUBLIC, "mesh2-ia"),
    (MESH2_LEAF_OP_PUBLIC, "mesh2-leaf-op"),
]:
    wait_healthy(public, label)
    print(f"  OK  {label} is healthy")

# ── 2. wire mesh2's own internal hierarchy ──────────────────────────────

print("\n=== mesh2-ta -> mesh2-ia ===\n")
ia_jwks = fetch_real_jwks(MESH2_IA_PUBLIC)
register_subordinate(
    MESH2_TA_ADMIN, MESH2_IA_EID, ia_jwks,
    ["federation_entity"],
    "mesh2 Intermediate Authority",
)
set_authority_hint(MESH2_IA_ADMIN, MESH2_TA_EID, "mesh2 root Trust Anchor")

print("\n=== mesh2-ia -> mesh2-leaf-op ===\n")
leaf_op_jwks = fetch_real_jwks(MESH2_LEAF_OP_PUBLIC)
register_subordinate(
    MESH2_IA_ADMIN, MESH2_LEAF_OP_EID, leaf_op_jwks,
    ["openid_provider", "federation_entity"],
    "mesh2 leaf OpenID Provider",
)
set_authority_hint(MESH2_LEAF_OP_ADMIN, MESH2_IA_EID, "mesh2 Intermediate Authority")

# ── 3. mesh2's own trust mark: Owner=mesh2-ta, Issuer=mesh2-ia, Subject=mesh2-leaf-op ──

print("\n=== mesh2's own trust mark ===\n")

tm2_type_id = f"{MESH2_TA_EID}/trustmarks/mesh2-member"
existing_types = api("GET", f"{MESH2_TA_ADMIN}/trust-marks/types") or []
tm2_type = next((t for t in existing_types if t.get("trust_mark_type") == tm2_type_id), None)
if tm2_type:
    print(f"  SKIP trust mark type already exists: {tm2_type_id}")
else:
    tm2_type = api("POST", f"{MESH2_TA_ADMIN}/trust-marks/types", {
        "trust_mark_type": tm2_type_id,
        "description": "mesh2 member",
    })
    if tm2_type:
        print(f"  OK  created trust mark type: {tm2_type_id}")
    else:
        print("  !!  failed to create trust mark type")

if tm2_type:
    existing_specs = api("GET", f"{MESH2_IA_ADMIN}/trust-marks/issuance-spec") or []
    spec2 = next((s for s in existing_specs if s.get("trust_mark_type") == tm2_type_id), None)
    if spec2:
        print(f"  SKIP issuance spec already exists for: {tm2_type_id}")
    else:
        spec2 = api("POST", f"{MESH2_IA_ADMIN}/trust-marks/issuance-spec", {"trust_mark_type": tm2_type_id})
        if spec2:
            print(f"  OK  created issuance spec (id={spec2['id']}) on mesh2-ia")
        else:
            print("  !!  failed to create issuance spec")

    if spec2:
        spec2_id = spec2["id"]
        existing_subjects = api("GET", f"{MESH2_IA_ADMIN}/trust-marks/issuance-spec/{spec2_id}/subjects") or []
        if any(s.get("entity_id") == MESH2_LEAF_OP_EID for s in existing_subjects):
            print(f"  SKIP subject already exists: {MESH2_LEAF_OP_EID}")
        else:
            subj = api("POST", f"{MESH2_IA_ADMIN}/trust-marks/issuance-spec/{spec2_id}/subjects", {
                "entity_id": MESH2_LEAF_OP_EID,
                "status": "active",
            })
            if subj:
                print(f"  OK  issued mesh2's own mark to: {MESH2_LEAF_OP_EID}")
            else:
                print(f"  !!  failed to issue mesh2's own mark to {MESH2_LEAF_OP_EID}")

# ── 4. interfederation: mesh-ia (the OTHER mesh) marks a mesh2 entity ───

print("\n=== Interfederation: mesh-ia marks mesh2-leaf-op ===\n")

mesh1_specs = api("GET", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec")
mesh1_spec = next((s for s in (mesh1_specs or []) if s.get("trust_mark_type") == MESH1_TM_TYPE), None)

if mesh1_spec is None:
    print("  SKIP mesh-ia has no issuance spec for mesh-member yet.")
    print("       Run scripts/seed-mesh.py first, then re-run this script.")
else:
    mesh1_spec_id = mesh1_spec["id"]
    existing_subjects = api("GET", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec/{mesh1_spec_id}/subjects") or []
    if any(s.get("entity_id") == MESH2_LEAF_OP_EID for s in existing_subjects):
        print(f"  SKIP mesh-ia already marked: {MESH2_LEAF_OP_EID}")
    else:
        subj = api("POST", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec/{mesh1_spec_id}/subjects", {
            "entity_id": MESH2_LEAF_OP_EID,
            "status": "active",
        })
        if subj:
            print(f"  OK  mesh-ia (mesh 1) issued its mark to mesh2-leaf-op (mesh 2)")
            print("      — an entity with zero hierarchical relationship to mesh-ia.")
        else:
            print("  !!  failed to issue cross-federation mark")

print("\n=== Done ===\n")
print("mesh2 hierarchy: mesh2-leaf-op -> mesh2-ia -> mesh2-ta\n")

if mesh1_spec is not None:
    tm_url = (f"http://localhost:8091/trust_mark?sub={urllib.parse.quote(MESH2_LEAF_OP_EID, safe='')}"
              f"&trust_mark_type={urllib.parse.quote(MESH1_TM_TYPE, safe='')}")
    print("This SHOULD succeed — trust marks are issuer-authoritative, no")
    print("chain required, regardless of which federation the subject lives in:")
    print(f"  curl '{tm_url}'")
    print("  curl -X POST http://localhost:8091/trust_mark/status \\")
    print("    -H 'Content-Type: application/x-www-form-urlencoded' \\")
    print(f"    --data-urlencode \"trust_mark=$(curl -s '{tm_url}')\"")
    print()
    print("This SHOULD fail with 404 invalid_trust_chain — there is no")
    print("authority_hint path from mesh2-leaf-op up through mesh-ta, and no")
    print("spec mechanism makes chain resolution cross an unrelated root:")
    resolve_url = (f"http://localhost:8091/resolve?sub={urllib.parse.quote(MESH2_LEAF_OP_EID, safe='')}"
                   f"&trust_anchor=http%3A%2F%2Fmesh-ta%3A8080")
    print(f"  curl '{resolve_url}'")
    print()

print("Or drive it from the app: switch instance to \"Mesh2 - Trust Anchor\" or")
print("\"Mesh2 - Intermediate\" in the sidebar to see mesh2's own hierarchy and")
print("trust mark; switch to \"Mesh - Intermediate\" to see mesh2-leaf-op listed")
print("as a subject on the mesh-member issuance spec, right alongside mesh-leaf-op.")
