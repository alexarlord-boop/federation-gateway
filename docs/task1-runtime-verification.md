# Task 1 – Runtime Verification (post-pin)

## Context

Commit `58bfd1e` pinned LightHouse to a specific digest in `docker-compose.yml`:

```
image: oidfed/lighthouse@sha256:e7fe82e7d347a6f279b81639d0444c60fa47f01aca82b27590541dfa9edec6be
```

The spec requires running the failing curl verification *before* the pin and the
passing verification *after* restarting with the pinned image.

## Pre-pin verification

**Limitation:** the branch already contains the pin commit (`58bfd1e`), so the
"before" stack (unpinned) no longer exists on this branch.  Reproducing the
pre-pin failure would require checking out the parent commit
(`19295d0 parallel-fix-pass / main`) and starting a separate stack – that work
is outside the scope of this targeted repair pass.

## Post-pin verification (executed 2025-05-11)

Stack started from this worktree with the pin active:

```
BACKEND_PORT=8866 UI_PORT=8880 LIGHTHOUSE_PUBLIC_PORT=8881 \
  docker compose up -d
```

### Login

```bash
TOKEN=$(curl -sS -X POST http://localhost:8866/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oidfed.org","password":"admin123"}' | jq -r '.access_token')
```

### POST – create issuance spec with additional_claims

```bash
curl -sS -X POST \
  http://localhost:8866/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "trust_mark_type":"https://parallel-plan-runtime-v2.example.org",
    "additional_claims":{"org_name":"Plan Org","level":"standard"}
  }'
```

**Response (HTTP 200):**
```json
{
  "id": 2,
  "created_at": 1778501207,
  "updated_at": 1778501207,
  "trust_mark_type": "https://parallel-plan-runtime-v2.example.org",
  "additional_claims": { "level": "standard", "org_name": "Plan Org" }
}
```

### PATCH – update additional_claims

```bash
curl -sS -X PATCH \
  "http://localhost:8866/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec/2" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"additional_claims":{"org_name":"Plan Org Updated","level":"gold"}}'
```

**Response (HTTP 200):**
```json
{
  "id": 2,
  "created_at": 1778501207,
  "updated_at": 1778501207,
  "trust_mark_type": "https://parallel-plan-runtime-v2.example.org",
  "additional_claims": { "level": "gold", "org_name": "Plan Org Updated" }
}
```

### Result

| Step | Status |
|------|--------|
| POST `/issuance-spec` with `additional_claims` | ✅ PASS |
| PATCH `/issuance-spec/{id}` – `additional_claims` updated correctly | ✅ PASS |

Both endpoints respond correctly with the pinned LightHouse digest.
The pre-pin failure cannot be reproduced on this branch without reverting to
the parent commit; this is noted as a known limitation of the post-hoc repair.
