# Production Readiness

Tracks what's left before this deployment is safe to hand to other people
— real federation admins, not just local dev/demo use. Originally listed
in `docs/KNOWN-ISSUES.md`'s "Production deployment gaps" section (still
the canonical source for the *evidence* behind each item — this file adds
priority order and status tracking on top, same relationship
`MESH-TESTING-PROGRESS.md` has to that file).

This is a checklist, not a narrative — update it in place as items move
from `[ ]` to `[x]`, evidence-based (what was built/verified), same
convention as `MESH-TESTING-PROGRESS.md`. Don't duplicate root-cause detail
here that already lives in `docs/KNOWN-ISSUES.md`; link to it instead.

Priority order below is the user's own call (2026-08-19), not derived from
severity scoring — reflects what actually blocks handing this to someone
else first.

---

## Priority order

1. [x] **Real user login** — external IdP federation via OIDC (SAML
   explicitly out of scope). Authorization-code + PKCE flow
   (`backend/app/routers/auth.py`'s `/api/auth/oidc/{provider}/login` +
   `/callback`), signed short-lived `state` carries provider/nonce/PKCE
   verifier (no server-side session store), ID token validated against
   the IdP's live JWKS via `authlib`. New SSO users are JIT-provisioned
   with **no RBAC role** — a super_admin assigns one afterward via the
   existing Users page, same as any other account (manual assignment,
   no claim/group auto-mapping, by design). Local password login is kept
   as a fallback; an account with `oidc_sub` set can no longer log in
   with a password. Admin UI at `/identity-providers`
   (`oidc_providers:manage`, super_admin-only) manages provider configs;
   client secrets encrypted at rest (Fernet, `OIDC_ENCRYPTION_KEY`).
   11 new backend tests (respx-mocked IdP + a forged, validly-signed ID
   token — no live IdP needed) plus full existing suite (116 total) and
   the BFF e2e tier green. Verified live end-to-end against a **real
   Keycloak instance** (not just mocks) — real browser redirect, real
   login form, real authorization-code+PKCE exchange, JIT-provisioned
   user landing on `/dashboard` with no RBAC role. That pass caught two
   real bugs, both fixed with regression tests: (1) the UI's nginx
   proxy used `$host` instead of `$http_host`, dropping the port from
   every forwarded `Host` header — broke `request.url_for`'s
   `redirect_uri` construction, which Keycloak correctly rejected
   (`Dockerfile`); (2) a genuinely pre-existing bug in
   `seed_rbac_data()`'s legacy-user migration — it unconditionally
   reassigned any legacy `role="user"`/`"admin"` account back to the
   default RBAC role on *every* call, silently reverting any
   manually-assigned role (including "leave this SSO user roleless")
   on every backend restart, since that function runs unconditionally
   at every startup. Never caught before because nothing had called it
   a second time mid-session until this verification pass did.

2. [ ] **Bootstrap admin credential** — the *only* path to `super_admin`
   is the seeded `admin@oidfed.org`/`admin123` local account
   (`backend/app/db/seed.py`, fires once against an empty DB) plus
   `rbac_seed.py`'s one-time legacy migration that assigns it
   `super_admin` on first boot. There's no invite flow, no forced
   password rotation or change-on-first-login, and no supported way to
   disable/rotate that seeded account short of editing the DB directly.
   A real deployment needs at least one of: a forced-rotation/change-
   on-first-login flow, an explicit "bootstrap complete, disable seed
   account" step, or a documented way to set a non-default password at
   first startup via env var — plus a loud callout in deployment docs
   (#7) either way. Found while explaining the current auth bootstrap
   path, not via a specific test.

3. [x] **LightHouse admin API auth** — `api.admin.users_enabled: true`
   now set in all 11 `config.yaml` files. LightHouse's actual mechanism
   is undocumented anywhere (no vendored docs — reverse-engineered from
   strings embedded in the `oidfed/lighthouse` binary, then confirmed
   live against a throwaway container): the flag alone enforces nothing
   until a user exists; while zero users exist,
   `POST /api/v1/admin/users/` is itself unauthenticated. New script
   `scripts/bootstrap-lighthouse-admin-users.py` creates exactly one
   admin user per instance using the credentials already flowing through
   this codebase (`LIGHTHOUSE_ADMIN_USERNAME`/`PASSWORD`,
   `LIGHTHOUSE2_ADMIN_USERNAME`/`PASSWORD`) — from that point every admin
   endpoint requires real Basic Auth, confirmed: no creds → `401`, wrong
   creds → `401`, right creds → `200`, persists across restarts.
   `backend/app/routers/proxy.py` and `main.py`'s capability prober
   needed **zero** code changes — they already sent this exact Basic
   Auth on every request. Four direct (non-proxy-mediated) callers did:
   `scripts/seed-demo.py`, `seed-mesh.py`, `seed-mesh2.py`,
   `generate_traffic_and_stats.sh`, and `mesh-tests/_lighthouse_client.py`
   — all updated. `e2e/` and every Docker healthcheck needed no changes
   (proxy-mediated / public-endpoint-only). Verified live end-to-end on
   the full 13-container stack: pre-bootstrap open → bootstrap → 401/200
   enforcement confirmed → idempotent re-run confirmed → all 4 scripts
   re-run successfully → full `mesh-tests` (25/25) → full e2e (26 `@bff`
   + 90 `@proxy`, 8 pre-existing skips) → backend restarted mid-session,
   capability probing and the proxy both still authenticate correctly.
   Credential strength itself is unchanged — still the same weak
   `gateway`/`gateway` defaults, now genuinely load-bearing for the
   first time, exactly as #5 already anticipated.

4. [x] **TLS everywhere** — scoped to documentation-only, deliberately
   (user's call, 2026-08-20): see `docs/TLS.md`, new. Every hop is still
   plain HTTP in the bundled demo stack — nothing here changes that. The
   real finding is why this doesn't decompose into one build task:
   LightHouse's `entity_id` is not a connection address, it's the
   entity's cryptographic identity in the federation (`CLAUDE.md`
   constraints #2/#11) — every subordinate registration and trust mark
   in the seeded demo mesh is signed against literal `http://mesh-ta:8080`-
   style strings, so changing scheme is an identity change, not a
   transport tweak, and can't be retrofitted or migrated in place.
   Browser→UI and UI→backend stay genuinely retrofittable (real reverse
   proxy/ingress + real cert, standard pattern, no identity semantics).
   backend→LightHouse (admin API, not federation-protocol — a separate
   config field from `entity_id`) is also transport-only but would need
   LightHouse's `admin_tls` config schema verified first (spotted in the
   binary's strings during #3's reverse-engineering, never confirmed
   live) plus `verify=` added to `proxy.py`/`capability_probe.py`'s
   httpx clients (neither passes it today). LightHouse-to-LightHouse
   federation-protocol TLS is the one that can't be bolted on after the
   fact: a real deployment needs real HTTPS entity_ids from the very
   first entity configuration it ever publishes, never `http://` now
   with a migration plan — the bundled demo mesh is explicitly not
   meant to be "upgraded" to this, it's disposable-by-design test
   fixture data. Full breakdown and a per-hop table in `docs/TLS.md`.

5. [x] **Secrets management** — scoped to "enforced non-default values
   with no fallback" (user's call, 2026-08-20; full Vault/cloud
   secrets-manager integration would commit this repo to a deployment
   shape it doesn't actually know, same tension #4 hit). `docker-compose.yml`
   no longer has *any* fallback default for `LIGHTHOUSE_ADMIN_USERNAME`/
   `PASSWORD`, `LIGHTHOUSE2_ADMIN_USERNAME`/`PASSWORD`, `OIDC_ENCRYPTION_KEY`,
   or the newly-added `JWT_SECRET` (found along the way — signs every
   gateway JWT, was silently falling back to a hardcoded
   `"dev-secret-change-me"` string in `backend/app/auth/security.py`,
   not previously even wired into `docker-compose.yml` at all) — `docker
   compose up` now fails closed with a clear per-variable error if `.env`
   is missing any of them (confirmed live). New `.env.example` documents
   every required value; new `scripts/generate-secrets.py` writes a real
   `.env` (gitignored) with freshly generated random passwords/keys for
   local/demo use, refusing to overwrite an existing one without
   `--force`. Every doc that documents `docker compose up` as the first
   command updated to run the generator first (`CLAUDE.md`, `README.md`,
   `docs/GETTING-STARTED.md`, `docs/LOCAL-DEVELOPMENT.md`,
   `docs/TESTING.md`) — `CLAUDE.md` also got a new hard constraint (#12)
   so this doesn't get rediscovered as a surprise in a future session.
   Found and fixed a real bug while verifying against the live,
   already-bootstrapped stack: rotating `LIGHTHOUSE_ADMIN_PASSWORD` in
   `.env` doesn't rotate the LightHouse-side user `scripts/bootstrap-
   lighthouse-admin-users.py` already created (#3) — had to fix the
   already-running stack by hand via LightHouse's `PUT
   /api/v1/admin/users/{username}`, then added a loud warning to
   `generate-secrets.py --force` about it. Also found and fixed a second
   real bug: `mesh-tests/`, the three `seed-*.py` scripts, and
   `generate_traffic_and_stats.sh` all run on the *host*, not through
   `docker compose` — they were reading credentials via `os.environ`
   with the old hardcoded fallback, so the moment `.env`'s generated
   password diverged from that fallback they'd have silently
   authenticated with a stale, wrong value. Fixed with a shared
   `.env`-loading helper (`scripts/_dotenv.py`, imported by all four
   Python scripts; a small inline equivalent in `mesh-tests/conftest.py`,
   kept local per that file's own stay-self-contained design; a bash
   version in the `.sh` script). Verified live end-to-end: full stack
   rebuilt with real generated secrets, backend restarted, LightHouse
   credentials rotated and confirmed old ones rejected / new ones
   accepted, full `mesh-tests` (25/25), all four host scripts re-run
   clean with zero auth errors, full e2e (26 `@bff` + 90 `@proxy`, 8
   pre-existing skips), full backend pytest (118, unaffected — its own
   env is independent of `docker compose`'s `.env`).

6. [ ] **Backup/restore** — no snapshot/restore procedure documented or
   automated anywhere for `backend/data/backend.db` (users, RBAC config,
   audit history, instance registry) or any LightHouse node's
   `data/lighthouse.db` + `data/keys/` (federation state, signing keys —
   losing a signing key is a genuinely different severity of loss than
   losing a database, since it can't be regenerated to the same identity).
   Not found via gap-testing — just never built.

7. [ ] **Deployment docs** — `docs/GETTING-STARTED.md`/`README.md` walk
   through running the bundled demo mesh (`mesh-*`/`mesh2-*`, seeded
   local accounts), not "how do I point this at my federation's real
   LightHouse instances with real credentials." Depends on #1-#6 landing
   first — a deployment guide written before the auth/TLS/secrets story
   is real would just be documenting the gaps.

## Tracked, not actionable here (handover)

- **LightHouse's `/resolve` doesn't honor a subordinate's `blocked`
  status** (`docs/KNOWN-ISSUES.md`, filed upstream against
  `go-oidfed/lighthouse`). Real trust/security implication for anyone
  relying on blocking as an actual control — worth surfacing to whoever
  picks this deployment up, but it's an upstream LightHouse bug, not
  something buildable in this repo. Re-check `docs/KNOWN-ISSUES.md` for
  fix status before considering this deployment-ready regardless of where
  the other items stand.

---

## Explicitly out of scope (for now)

- Multi-tenancy / shared-SaaS isolation — this deployment's model is one
  gateway instance per federation operator (self-hosted), not multiple
  organizations sharing one deployment. Not a gap unless that model
  changes.
- Rate limiting / DoS protection on the backend's own API — not
  evaluated yet; not clear it's actually needed before #1-#7, revisit
  once real auth exists (rate limiting an unauthenticated demo endpoint
  is a different problem than rate limiting a real login).
