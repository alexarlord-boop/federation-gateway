# CLAUDE.md

Map of this repo, not a manual. If you're new here, also read `PROGRESS.md`
(current state) before doing anything.

## What this is

A backend-agnostic OpenID Federation admin UI: a React/TypeScript frontend,
a FastAPI backend-for-frontend (auth, RBAC, audit, instance registry, and a
transparent proxy), and one or more real LightHouse federation nodes it
manages. Any Admin API implementing `Federation Admin OpenAPI.yaml` can
plug in in place of the reference FastAPI backend.

## First run

```sh
python3 scripts/generate-secrets.py   # one-time — see hard constraint 12
docker compose up -d --build
```

Opens at http://localhost:8080. Login: `admin@oidfed.org` / `admin123`
(the default in `.env.example` — configurable via `ADMIN_BOOTSTRAP_PASSWORD`,
see hard constraint 12; this is the only path to `super_admin` on a fresh
DB, PRODUCTION-READINESS.md #2).
Brings up 13 containers: `ui`, `backend`, two standalone LightHouse trust
anchors (`lighthouse`, `lighthouse2`), a 6-node LightHouse mesh
(`mesh-ta`/`mesh-ia`/`mesh-ia2`/`mesh-leaf-op`/`mesh-leaf-rp`/`mesh-leaf-multi`)
for multi-hop and multi-parent testing, and a second, fully independent
3-node mesh (`mesh2-*`) for interfederation testing. Full tour:
`docs/GETTING-STARTED.md`.

## Hard constraints

1. **Rebuild ≠ restart.** `docker compose restart <svc>` reuses the
   existing image — it will *not* pick up `ui` or `backend` source
   changes. Use `docker compose up -d --build <svc>`.
2. **LightHouse `entity_id` must be a docker-network hostname**
   (`http://mesh-ta:8080`), never `localhost` — required for any
   cross-container trust-chain resolution to work at all. See
   `docs/FEDERATION-TOPOLOGY.md`.
3. **Don't trust local `pytest`.** `backend/.venv` is currently stale
   (Python 3.9; the project is pinned to 3.11 in `backend/.python-version`
   and `backend/Dockerfile`). Run backend tests against the built image
   instead — exact command in `docs/TESTING.md`.
4. **`gateway.yaml` instance `name` values must stay ASCII.**
   `backend/app/routers/proxy.py` echoes the display name into an HTTP
   response header; non-latin1 characters crash the whole proxied request
   with `UnicodeEncodeError`.
5. **`trust_mark_status` is POST + `application/x-www-form-urlencoded`**
   per the OIDF spec's normative text, not GET. See `docs/KNOWN-ISSUES.md`
   for the full story (this was gotten backwards once already).
6. **The SSRF guard in `resolve.py` is deliberate** (https-only,
   private/loopback IPs blocked). It's *why* Chain Inspector's "Any
   Entity" mode and the live trust-mark checker can't reach the local
   mesh's plain-http entity_ids — don't "fix" that by loosening the guard.
7. **`src/client/` is auto-generated** from the OpenAPI spec. Never
   hand-edit it; CI's `scripts/verify-client-freshness.mjs` checks it
   still matches the spec.
8. **`lighthouse*/data/`, `mesh-*/data/` hold runtime state** (SQLite DB +
   real signing keys) — gitignored, never force-add a file from there.
9. **Never push to `origin/main` without being explicitly asked**, even
   after a commit was explicitly requested.
10. **e2e test tags**: `@bff` = BFF-only, no Docker needed. `@proxy` =
    full Docker stack must already be running. See `docs/TESTING.md`.
11. **The mesh uses Docker Compose, not Kubernetes**, on purpose —
    `entity_id` is a literal URL baked into an entity's identity, which
    fights k3s-style dynamic scheduling/service discovery. Compose's
    static container DNS names map onto that model directly.
12. **`docker compose up` fails closed without a root `.env`.**
    `LIGHTHOUSE_ADMIN_*`/`LIGHTHOUSE2_ADMIN_*`/`OIDC_ENCRYPTION_KEY`/
    `JWT_SECRET`/`ADMIN_BOOTSTRAP_PASSWORD` have no fallback defaults
    (PRODUCTION-READINESS.md #5/#2) — run
    `python3 scripts/generate-secrets.py` once (writes a gitignored
    `.env`) before the first `docker compose up`. Unlike the others,
    `ADMIN_BOOTSTRAP_PASSWORD` stays `admin123` in `.env.example` and is
    never randomized — it's a human-typed login, not a machine secret.

## Verification (run before calling anything done)

```sh
# Frontend
npx tsc --noEmit -p .
npx eslint <changed files>
npm run build

# Backend (see constraint 3 — do not use the local .venv)
docker run --rm \
  -v "$(pwd)/backend/tests:/app/tests:ro" \
  -v "$(pwd)/backend/pytest.ini:/app/pytest.ini:ro" \
  federation-gateway-backend python3 -m pytest tests/ -q

# e2e — BFF-only (fast, no Docker)
cd e2e && npm run test:bff

# e2e — full-stack (requires: docker compose up -d --build)
cd e2e && npm run test:full
```

Feature complete = passed the relevant tier(s) above, not "code compiles."
For a UI change, that means actually looking at it running (screenshot or
live check), not just a green typecheck.

## Session exit checklist

- [ ] Frontend typecheck/lint clean; backend tests pass against the built image
- [ ] Relevant e2e tier passes
- [ ] `docker compose ps` shows the stack healthy if you touched anything runtime-facing
- [ ] No scratch files left behind (`e2e/tests/_scratch-*.spec.ts`, stray `test-results/`)
- [ ] `PROGRESS.md` updated if this session did anything worth a future session knowing about
- [ ] Nothing pushed to `origin/main` unless explicitly asked

## Topic docs (`docs/`)

- `GETTING-STARTED.md` — human tour: run it, then use it (bundled demo mesh)
- `DEPLOYMENT.md` — pointing this at a real LightHouse instance instead of the demo mesh
- `ARCHITECTURE.md` — system design, component responsibilities
- `CAPABILITY-DISCOVERY.md` — how the capability manifest drives dynamic UI adaptation
- `KNOWN-ISSUES.md` — read before assuming something broken is a new bug; also this project's de facto feature/gap tracker
- `TESTING.md` — full test-running reference (frontend, backend, e2e, mise)
- `LOCAL-DEVELOPMENT.md` — running UI/backend outside Docker
- `FEDERATION-TOPOLOGY.md` — adding an instance, the LightHouse mesh, the Trust Anchors page model
- `BACKEND-IMPLEMENTORS.md` — implementing the Admin API in another language
- `TLS.md` — why TLS can't be retrofitted onto LightHouse-to-LightHouse traffic, what a real deployment needs per hop
- `BACKUP-RESTORE.md` — snapshotting/restoring databases + LightHouse signing keys (`scripts/backup.py`/`restore.py`)

`MESH-TESTING-PROGRESS.md` (repo root) — checklist of OIDF spec-defined
flows against the mesh setup, what's proven vs. still untested.

`PRODUCTION-READINESS.md` (repo root) — priority-ordered checklist of what's
left before this deployment is safe to hand to a real federation admin
(real login, LightHouse admin auth, TLS, secrets, backup/restore,
deployment docs).

`PROGRESS.md` (repo root) — current state, recent work, open blockers. Read
it at the start of a session; update it before a substantial one ends.
