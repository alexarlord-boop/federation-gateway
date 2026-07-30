#!/usr/bin/env python3
"""
Wire the small LightHouse mesh into a real, cryptographically valid trust
chain (see docker-compose.yml for the four mesh-* services):

    mesh-ta (root TA)  ->  mesh-ia (Intermediate)  ->  mesh-leaf-op (Subject)
                                                     ->  mesh-leaf-rp (verifier)

Unlike scripts/seed-demo.py (which fabricates throwaway JWKS for fake,
non-running entities — fine for populating list/table UIs, useless for real
chain-walking), every node here is a real running LightHouse container with
its own auto-generated signing key. So each subordinate registration below
first *fetches the child's own entity configuration and pulls its real
jwks out of it* — a fabricated key would make signature validation fail the
moment anything actually walks the chain.

Run:  python3 scripts/seed-mesh.py
Requires only the Python standard library.
"""

import base64
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

# Admin API base (script runs on the host, so these are the published ports).
MESH_TA_ADMIN = "http://localhost:8090/api/v1/admin"
MESH_IA_ADMIN = "http://localhost:8091/api/v1/admin"
MESH_LEAF_OP_ADMIN = "http://localhost:8092/api/v1/admin"
MESH_LEAF_RP_ADMIN = "http://localhost:8093/api/v1/admin"

# Public entity-configuration URL (also the host-published port).
MESH_TA_PUBLIC = "http://localhost:8090"
MESH_IA_PUBLIC = "http://localhost:8091"
MESH_LEAF_OP_PUBLIC = "http://localhost:8092"
MESH_LEAF_RP_PUBLIC = "http://localhost:8093"

# Canonical entity_id of each node — the docker-network hostname baked into
# its own config.yaml, i.e. what actually appears as `sub`/`iss` in its
# self-signed entity configuration and what other mesh nodes use to reach it.
MESH_TA_EID = "http://mesh-ta:8080"
MESH_IA_EID = "http://mesh-ia:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"


# ── helpers ──────────────────────────────────────────────────────────────

def api(method, url, body=None, content_type="application/json"):
    data = body
    if content_type == "application/json" and body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": content_type, "X-Gateway-User-Email": "seed-mesh@demo.local"},
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
    """Decode a compact JWT's payload without verifying its signature — we
    only need the jwks claim, and the signature is trivially re-verified by
    whoever actually walks the chain later."""
    payload_b64 = jwt_text.split(".")[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def fetch_real_jwks(public_base):
    """Fetch a node's own entity configuration and pull its real jwks —
    the key it actually signs with, as opposed to a fabricated one."""
    url = f"{public_base}/.well-known/openid-federation"
    with urllib.request.urlopen(url) as resp:
        jwt_text = resp.read().decode()
    payload = decode_jwt_payload(jwt_text)
    return payload["jwks"]


def wait_healthy(public_base, label, attempts=30, delay=1):
    import time
    url = f"{public_base}/.well-known/openid-federation"
    for i in range(attempts):
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


# ── 1. wait for all four nodes ──────────────────────────────────────────

print("\n=== Waiting for mesh containers to become healthy ===\n")
for public, label in [
    (MESH_TA_PUBLIC, "mesh-ta"),
    (MESH_IA_PUBLIC, "mesh-ia"),
    (MESH_LEAF_OP_PUBLIC, "mesh-leaf-op"),
    (MESH_LEAF_RP_PUBLIC, "mesh-leaf-rp"),
]:
    wait_healthy(public, label)
    print(f"  OK  {label} is healthy")

# ── 2. wire the subordinate chain (real jwks + authority hints) ─────────

print("\n=== mesh-ta -> mesh-ia ===\n")
ia_jwks = fetch_real_jwks(MESH_IA_PUBLIC)
register_subordinate(
    MESH_TA_ADMIN, MESH_IA_EID, ia_jwks,
    ["federation_entity"],
    "Mesh Intermediate Authority",
)
set_authority_hint(MESH_IA_ADMIN, MESH_TA_EID, "Mesh root Trust Anchor")

print("\n=== mesh-ia -> mesh-leaf-op ===\n")
leaf_op_jwks = fetch_real_jwks(MESH_LEAF_OP_PUBLIC)
register_subordinate(
    MESH_IA_ADMIN, MESH_LEAF_OP_EID, leaf_op_jwks,
    ["openid_provider", "federation_entity"],
    "Mesh leaf OpenID Provider — trust mark Subject",
)
set_authority_hint(MESH_LEAF_OP_ADMIN, MESH_IA_EID, "Mesh Intermediate Authority")

print("\n=== mesh-ia -> mesh-leaf-rp ===\n")
leaf_rp_jwks = fetch_real_jwks(MESH_LEAF_RP_PUBLIC)
register_subordinate(
    MESH_IA_ADMIN, MESH_LEAF_RP_EID, leaf_rp_jwks,
    ["openid_relying_party", "federation_entity"],
    "Mesh leaf Relying Party — used from Chain Inspector as verifier",
)
set_authority_hint(MESH_LEAF_RP_ADMIN, MESH_IA_EID, "Mesh Intermediate Authority")

# ── 3. trust mark: Owner=mesh-ta, Issuer=mesh-ia, Subject=mesh-leaf-op ───

print("\n=== Trust mark: owned by mesh-ta, issued by mesh-ia ===\n")

tm_type_id = f"{MESH_TA_EID}/trustmarks/mesh-member"
existing_types = api("GET", f"{MESH_TA_ADMIN}/trust-marks/types") or []
tm_type = next((t for t in existing_types if t.get("trust_mark_type") == tm_type_id), None)
if tm_type:
    print(f"  SKIP trust mark type already exists: {tm_type_id}")
else:
    tm_type = api("POST", f"{MESH_TA_ADMIN}/trust-marks/types", {
        "trust_mark_type": tm_type_id,
        "description": "Mesh member — issued by the Intermediate on the root's behalf",
    })
    if tm_type:
        print(f"  OK  created trust mark type: {tm_type_id}")
    else:
        print("  !!  failed to create trust mark type")

if tm_type:
    existing_specs = api("GET", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec") or []
    spec = next((s for s in existing_specs if s.get("trust_mark_type") == tm_type_id), None)
    if spec:
        print(f"  SKIP issuance spec already exists for: {tm_type_id}")
    else:
        spec = api("POST", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec", {
            "trust_mark_type": tm_type_id,
        })
        if spec:
            print(f"  OK  created issuance spec (id={spec['id']}) on mesh-ia")
        else:
            print("  !!  failed to create issuance spec")

    if spec:
        spec_id = spec["id"]
        existing_subjects = api("GET", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec/{spec_id}/subjects") or []
        if any(s.get("entity_id") == MESH_LEAF_OP_EID for s in existing_subjects):
            print(f"  SKIP subject already exists: {MESH_LEAF_OP_EID}")
        else:
            subj = api("POST", f"{MESH_IA_ADMIN}/trust-marks/issuance-spec/{spec_id}/subjects", {
                "entity_id": MESH_LEAF_OP_EID,
                "status": "active",
            })
            if subj:
                print(f"  OK  issued trust mark to: {MESH_LEAF_OP_EID}")
            else:
                print(f"  !!  failed to issue trust mark to {MESH_LEAF_OP_EID}")

print("\n=== Done ===\n")
print("Chain: mesh-leaf-op -> mesh-ia -> mesh-ta\n")
print("Verify multi-hop resolution (run from any mesh container, or curl the")
print("published port directly since /resolve fetches by entity_id over HTTP):")
print(f"  http://localhost:8091/resolve?sub={urllib.parse.quote(MESH_LEAF_OP_EID, safe='')}"
      f"&trust_anchor={urllib.parse.quote(MESH_TA_EID, safe='')}")
print()
if tm_type:
    # trust_mark_status is POST + application/x-www-form-urlencoded per the
    # OIDF spec's normative text (see backend/app/routers/resolve.py) — the
    # mark JWT itself, not sub/type, is what you send.
    tm_url = (f"http://localhost:8091/trust_mark?sub={urllib.parse.quote(MESH_LEAF_OP_EID, safe='')}"
              f"&trust_mark_type={urllib.parse.quote(tm_type_id, safe='')}")
    print("Fetch the trust mark JWT:")
    print(f"  curl '{tm_url}'")
    print()
    print("Then check its status (spec-compliant POST, not GET):")
    print("  curl -X POST http://localhost:8091/trust_mark/status \\")
    print("    -H 'Content-Type: application/x-www-form-urlencoded' \\")
    print(f"    --data-urlencode \"trust_mark=$(curl -s '{tm_url}')\"")
else:
    print("  (trust mark type creation failed above)")
print()
print("Or drive it from the app: switch instance to \"Mesh - Trust Anchor\" or")
print("\"Mesh - Intermediate\" in the sidebar, then check Entities / Trust Marks /")
print("Chain Inspector. On Chain Inspector's \"Via Trust Anchor\" tab, expand")
print("\"Override trust anchor entity ID for resolve\" and paste in the anchor's")
print("real entity_id (e.g. http://mesh-ta:8080) — it defaults to the gateway's")
print("public_base_url (http://localhost:8090), which won't resolve.")
