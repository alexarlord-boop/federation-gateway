#!/usr/bin/env python3
"""
Seed demo data for the two-TA demo:
  ta-1 (http://localhost:8081) = HomeFed TA  → registers a test IDP
  ta-2 (http://localhost:8082) = PeerFed TA  → registers a test RP

Run:  python3 scripts/seed-demo.py
Requires: pip install cryptography requests (or use system Python with these)
"""

import base64
import json
import sys
import urllib.request
import urllib.error

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

TA1 = "http://localhost:8081/api/v1/admin"
TA2 = "http://localhost:8082/api/v1/admin"


# ── helpers ────────────────────────────────────────────────────────────────

def itob64(n, l=32):
    b = n.to_bytes((n.bit_length() + 7) // 8, "big").rjust(l, b"\x00")
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def gen_jwks(kid):
    k = ec.generate_private_key(ec.SECP256R1(), default_backend())
    p = k.public_key().public_numbers()
    return {
        "keys": [
            {
                "kty": "EC",
                "use": "sig",
                "alg": "ES256",
                "crv": "P-256",
                "kid": kid,
                "x": itob64(p.x),
                "y": itob64(p.y),
            }
        ]
    }


def api(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "X-Gateway-User-Email": "seed-script@demo.local"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"  !! {method} {url} → HTTP {e.code}: {body_text[:200]}")
        return None


def approve(base, entity_id):
    """Set status to active via plain-text body (LH expects text/plain)."""
    url = f"{base}/subordinates/{urllib.parse.quote(entity_id, safe='')}/status"
    data = b"active"
    req = urllib.request.Request(
        url,
        data=data,
        method="PUT",
        headers={"Content-Type": "text/plain", "X-Gateway-User-Email": "seed-script@demo.local"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"  !! PUT {url} → HTTP {e.code}: {body_text[:200]}")
        return None


import urllib.parse


def check_exists(base, entity_id):
    subs = api("GET", f"{base}/subordinates")
    if subs is None:
        return False
    encoded = urllib.parse.quote(entity_id, safe="")
    for s in subs:
        if s.get("entity_id") == entity_id:
            return True
    return False


# ── ta-1: HomeFed ────────────────────────────────────────────────────────

print("\n=== ta-1: HomeFed (http://localhost:8081) ===\n")

entities_ta1 = [
    {
        "entity_id": "https://idp.helsinki.example",
        "description": "University of Helsinki — OpenID Provider",
        "registered_entity_types": ["openid_provider", "federation_entity"],
        "status": "active",
        "_kid": "idp-helsinki",
    },
    {
        "entity_id": "https://idp.amsterdam.example",
        "description": "University of Amsterdam — OpenID Provider",
        "registered_entity_types": ["openid_provider", "federation_entity"],
        "status": "active",
        "_kid": "idp-amsterdam",
    },
    {
        "entity_id": "https://idp.newcastle.example",
        "description": "Newcastle University — OpenID Provider (awaiting approval)",
        "registered_entity_types": ["openid_provider"],
        "status": "pending",
        "_kid": None,
    },
]

ta1_idps = []
for e in entities_ta1:
    if check_exists(TA1, e["entity_id"]):
        print(f"  SKIP already exists: {e['entity_id']}")
        ta1_idps.append(e["entity_id"])
        continue
    payload = {k: v for k, v in e.items() if not k.startswith("_")}
    if e["_kid"]:
        payload["jwks"] = gen_jwks(e["_kid"])
    result = api("POST", f"{TA1}/subordinates", payload)
    if result:
        print(f"  OK  created: {e['entity_id']}  status={e['status']}")
        ta1_idps.append(e["entity_id"])
    else:
        print(f"  !!  failed:  {e['entity_id']}")


# ── ta-2: PeerFed ─────────────────────────────────────────────────────────

print("\n=== ta-2: PeerFed (http://localhost:8082) ===\n")

entities_ta2 = [
    {
        "entity_id": "https://library.leuven.example",
        "description": "KU Leuven Library Portal — Relying Party",
        "registered_entity_types": ["openid_relying_party", "federation_entity"],
        "status": "active",
        "_kid": "rp-leuven",
    },
    {
        "entity_id": "https://student-portal.swamid.example",
        "description": "SWAMID Student Portal — Relying Party",
        "registered_entity_types": ["openid_relying_party"],
        "status": "active",
        "_kid": "rp-swamid",
    },
    {
        "entity_id": "https://research.dfn.example",
        "description": "DFN Research Gateway — Relying Party (awaiting approval)",
        "registered_entity_types": ["openid_relying_party"],
        "status": "pending",
        "_kid": None,
    },
]

ta2_rps = []
for e in entities_ta2:
    if check_exists(TA2, e["entity_id"]):
        print(f"  SKIP already exists: {e['entity_id']}")
        ta2_rps.append(e["entity_id"])
        continue
    payload = {k: v for k, v in e.items() if not k.startswith("_")}
    if e["_kid"]:
        payload["jwks"] = gen_jwks(e["_kid"])
    result = api("POST", f"{TA2}/subordinates", payload)
    if result:
        print(f"  OK  created: {e['entity_id']}  status={e['status']}")
        ta2_rps.append(e["entity_id"])
    else:
        print(f"  !!  failed:  {e['entity_id']}")


# ── ta-1: Trust Marks ────────────────────────────────────────────────────

print("\n=== ta-1: Trust Marks ===\n")

# Create the trust mark type
tm_type_id = "http://localhost:8081/trustmarks/research-and-education"
existing_types = api("GET", f"{TA1}/trust-marks/types") or []
existing_type_ids = [t.get("trust_mark_type") for t in existing_types]

if tm_type_id in existing_type_ids:
    print(f"  SKIP trust mark type already exists: {tm_type_id}")
    tm_type = next(t for t in existing_types if t["trust_mark_type"] == tm_type_id)
else:
    tm_type = api("POST", f"{TA1}/trust-marks/types", {
        "trust_mark_type": tm_type_id,
        "description": "Research and Education — member institution of HomeFed",
    })
    if tm_type:
        print(f"  OK  created trust mark type: {tm_type_id}")
    else:
        print(f"  !!  failed to create trust mark type")
        tm_type = None

# Create an issuance spec for that trust mark type
if tm_type:
    tm_internal_id = tm_type.get("id")
    existing_specs = api("GET", f"{TA1}/trust-marks/issuance-spec") or []
    spec_for_type = next((s for s in existing_specs if s.get("trust_mark_type") == tm_type_id), None)

    if spec_for_type:
        print(f"  SKIP issuance spec already exists for: {tm_type_id}")
        spec_id = spec_for_type["id"]
    else:
        spec = api("POST", f"{TA1}/trust-marks/issuance-spec", {
            "trust_mark_type": tm_type_id,
        })
        if spec:
            spec_id = spec["id"]
            print(f"  OK  created issuance spec (id={spec_id})")
        else:
            spec_id = None
            print(f"  !!  failed to create issuance spec")

    # Add Helsinki IDP as a subject
    if spec_id and "https://idp.helsinki.example" in ta1_idps:
        existing_subjects = api("GET", f"{TA1}/trust-marks/issuance-spec/{spec_id}/subjects") or []
        existing_sub_ids = [s.get("subject") for s in existing_subjects]
        if "https://idp.helsinki.example" in existing_sub_ids:
            print(f"  SKIP subject already exists: https://idp.helsinki.example")
        else:
            subj = api("POST", f"{TA1}/trust-marks/issuance-spec/{spec_id}/subjects", {
                "entity_id": "https://idp.helsinki.example",
                "status": "active",
            })
            if subj:
                print(f"  OK  issued trust mark to: https://idp.helsinki.example")
            else:
                print(f"  !!  failed to issue trust mark to https://idp.helsinki.example")

    # Add Amsterdam IDP as a subject
    if spec_id and "https://idp.amsterdam.example" in ta1_idps:
        existing_subjects = api("GET", f"{TA1}/trust-marks/issuance-spec/{spec_id}/subjects") or []
        existing_sub_ids = [s.get("subject") for s in existing_subjects]
        if "https://idp.amsterdam.example" in existing_sub_ids:
            print(f"  SKIP subject already exists: https://idp.amsterdam.example")
        else:
            subj = api("POST", f"{TA1}/trust-marks/issuance-spec/{spec_id}/subjects", {
                "entity_id": "https://idp.amsterdam.example",
                "status": "active",
            })
            if subj:
                print(f"  OK  issued trust mark to: https://idp.amsterdam.example")
            else:
                print(f"  !!  failed to issue trust mark to https://idp.amsterdam.example")


# ── ta-2: Authority Hints → ta-1 ─────────────────────────────────────────

print("\n=== ta-2: Authority Hints → ta-1 ===\n")

existing_hints = api("GET", f"{TA2}/entity-configuration/authority-hints") or []
existing_hint_ids = [h.get("authority_hint") for h in existing_hints]

if "http://localhost:8081" in existing_hint_ids:
    print(f"  SKIP authority hint already set: http://localhost:8081")
else:
    hint = api("POST", f"{TA2}/entity-configuration/authority-hints", {
        "entity_id": "http://localhost:8081",
        "description": "HomeFed TA — upstream trust anchor",
    })
    if hint:
        print(f"  OK  ta-2 now has authority hint → http://localhost:8081 (ta-1)")
    else:
        print(f"  !!  failed to set authority hint")


print("\n=== Done ===\n")
print("Demo entities registered:")
print("  ta-1 (HomeFed):")
for eid in ["https://idp.helsinki.example", "https://idp.amsterdam.example", "https://idp.newcastle.example (pending)"]:
    print(f"    • {eid}")
print("  ta-2 (PeerFed):")
for eid in ["https://library.leuven.example", "https://student-portal.swamid.example", "https://research.dfn.example (pending)"]:
    print(f"    • {eid}")
print()
print("Trust chain fetch (works now):")
print("  http://localhost:8081/fetch?sub=https://idp.helsinki.example")
print("  http://localhost:8082/fetch?sub=https://library.leuven.example")
print()
print("Trust mark endpoint:")
print("  http://localhost:8081/trust_marks?issuer=http://localhost:8081&sub=https://idp.helsinki.example&type=http://localhost:8081/trustmarks/research-and-education")
