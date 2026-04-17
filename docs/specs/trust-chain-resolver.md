# Feature Spec: Trust Chain Resolver UI

## Problem

Federation operators frequently need to debug trust relationships:
*"Can entity X interact with entity Y through this federation?"*
*"What metadata does entity X have after all policies are applied?"*

LightHouse exposes a `/resolve` OIDFed endpoint that answers both questions —
it resolves a trust chain from a subject entity up to a trust anchor, applies all
intermediate metadata policies, and returns the merged metadata. The BFF also has
`/api/v1/admin/resolve` but that endpoint only **fetches an entity's own
`.well-known/openid-federation`** (used to pre-fill the registration wizard). Neither
is exposed in the UI as an interactive debugging tool.

## Goal

Add a **Resolver** tool (page or slide-over panel) where operators can:

1. Enter a **subject entity ID** (the entity to resolve)
2. Optionally enter a **trust anchor entity ID** (defaults to the active instance)
3. Click **Resolve** and see:
   - The resolved merged metadata (JSON)
   - The trust chain path (list of entity IDs from subject → TA)
   - Any errors (no path found, invalid signature, expired statement)

---

## LightHouse Resolve Endpoint (backend reality)

LightHouse's `/resolve` endpoint implements OIDFed §12 — it is already enabled in
`lighthouse/config.yaml`:

```yaml
endpoints:
  resolve:
    path: /resolve
```

**Request:**
```
GET http://localhost:8081/resolve?sub=<entity_id>&anchor=<ta_entity_id>&type=<entity_type>
```

| Param | Required | Description |
|---|---|---|
| `sub` | Yes | Subject entity ID to resolve |
| `anchor` | No | Trust anchor entity ID; defaults to LightHouse's own entity_id |
| `type` | No | Filter by entity type (e.g. `openid_provider`) |

**Response:** A signed JWT (content-type `application/resolve-response+jwt`).  
The JWT payload contains `metadata` (merged), `trust_chain` (array of JWTs),
`trust_marks`, and `error` (if resolution failed).

This endpoint is **public** (no auth required by OIDFed spec). The BFF proxy can
forward to it without authentication headers.

---

## Proposed UI

### Location
New top-level page: `/resolver` — *Federation → Resolver* in the sidebar.

### Layout

**Input panel** (top)
```
Subject Entity ID:  [https://entity.example.org                    ] [Resolve]
Trust Anchor:       [https://ta.example.org (active instance)      ] [clear]
Entity Type:        [Any ▾]
```

**Results panel** (below, shown after first resolve)

Three tabs:
- **Trust Chain** — ordered list of entity IDs from subject → TA, each row
  expandable to show the raw statement JWT decoded payload
- **Merged Metadata** — JSON viewer (read-only, collapsible, syntax-highlighted)
  showing the result of applying all policies
- **Raw JWT** — the full resolve response JWT for copy/paste into jwt.io

**Error state** — if `error` key is present in the payload, show it prominently
with the chain stopped at the failing link.

### History
- Last 10 queries stored in `localStorage` under `resolver_history`
- Shown as chips below the input for quick re-runs

---

## BFF changes needed

**No new BFF routes** — the resolve endpoint is public OIDFed protocol. The UI can
call LightHouse's resolve URL directly. The active trust anchor's `entity_id` config
(already in the trust anchor settings) provides the base URL.

*However*, if we want SSRF protection and consistent auth-gated access:

```python
# backend/app/routers/resolve.py  (extend existing file)
@router.get("/resolve/chain")
async def resolve_trust_chain(
    sub: str = Query(...),
    anchor: str = Query(None),
    type: str = Query(None),
    _user = Depends(get_current_user),
):
    """Proxy LightHouse /resolve — decode JWT, return JSON."""
    lh_url = f"{settings.LIGHTHOUSE_URL}/resolve"
    params = {"sub": sub}
    if anchor: params["anchor"] = anchor
    if type: params["type"] = type
    # fetch → decode JWT payload → return JSON
```

---

## Gaps / Caveats

- **JWT signature verification is skipped** — the BFF decodes the resolve response
  JWT payload for display without verifying the signature (same as the registration
  wizard). Operators should be informed the chain is "as reported by LightHouse."
- **LightHouse `entity_id` must be a real HTTPS URL** for the resolve endpoint to
  work in production. Our dev config uses `http://localhost:8081` — resolution of
  external entities will fail unless the entity publicly advertises this TA.
- **Cross-origin in local dev** — if the UI calls LightHouse directly (not through
  BFF), CORS headers on LightHouse's public endpoints must allow the UI origin.
  Routing through BFF proxy avoids this.
- The `/resolve` endpoint fetches live from the internet — timeouts are expected
  for entities that are slow or unreachable.

---

## Implementation checklist

- [ ] Add BFF `/resolve/chain` endpoint (or confirm direct-to-LH approach)
- [ ] Add `useResolveChain(sub, anchor, type)` hook
- [ ] Add `ResolverPage` (`src/pages/ResolverPage.tsx`)
- [ ] Add sidebar link: *Federation → Resolver*
- [ ] Add route `/resolver` in router config
- [ ] Input form with entity ID inputs + entity type select
- [ ] `TrustChainTab` — ordered list of statements with expandable JWT payloads
- [ ] `MergedMetadataTab` — read-only JSON viewer
- [ ] `RawJwtTab` — copyable raw JWT
- [ ] History: last 10 queries in localStorage
- [ ] Error handling for: resolution failure, network timeout, invalid JWT
- [ ] e2e test: resolver page loads, input accepted, result tabs visible
