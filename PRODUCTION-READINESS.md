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

2. [ ] **LightHouse admin API auth** — `api.admin.users_enabled: false`
   in every `config.yaml` in this repo. The only thing protecting those
   admin APIs today is docker-network isolation, not real access control.
   `backend/app/routers/proxy.py` already attaches Basic Auth on every
   proxied request, so LightHouse-side enforcement should be additive —
   but `users_enabled: true` has never actually been tested against this
   deployment. Needs its own design pass (does turning this on break
   anything already relying on the current unauthenticated behavior —
   `scripts/seed-mesh.py`/`seed-mesh2.py`, `mesh-tests/`, e2e fixtures?).

3. [ ] **TLS everywhere** — every hop (browser→UI, UI→backend,
   backend→LightHouse, LightHouse→LightHouse) is plain HTTP today,
   including between containers. No cert termination configured anywhere
   in this repo (reverse proxy, sidecar, or otherwise).

4. [ ] **Secrets management** — `LIGHTHOUSE_ADMIN_USERNAME`/`PASSWORD`
   and `LIGHTHOUSE2_ADMIN_USERNAME`/`PASSWORD` are plain env vars with
   weak hardcoded defaults (`gateway`/`gateway`, `gateway2`/`gateway2`,
   `docker-compose.yml`), no secrets-manager integration. Needs a real
   secrets story (Vault, cloud secrets manager, or at minimum enforced
   non-default values with no fallback) before real deployment. Overlaps
   with #2 — turning on LightHouse-side auth makes these credentials
   actually load-bearing for the first time, raising the stakes on
   getting this right together. `OIDC_ENCRYPTION_KEY` (added for #1, the
   Fernet key encrypting stored IdP client secrets) has the exact same
   dev-default-in-`docker-compose.yml` problem — same fix, same place.

5. [ ] **Backup/restore** — no snapshot/restore procedure documented or
   automated anywhere for `backend/data/backend.db` (users, RBAC config,
   audit history, instance registry) or any LightHouse node's
   `data/lighthouse.db` + `data/keys/` (federation state, signing keys —
   losing a signing key is a genuinely different severity of loss than
   losing a database, since it can't be regenerated to the same identity).
   Not found via gap-testing — just never built.

6. [ ] **Deployment docs** — `docs/GETTING-STARTED.md`/`README.md` walk
   through running the bundled demo mesh (`mesh-*`/`mesh2-*`, seeded
   local accounts), not "how do I point this at my federation's real
   LightHouse instances with real credentials." Depends on #1-#5 landing
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
  the other 6 items stand.

---

## Explicitly out of scope (for now)

- Multi-tenancy / shared-SaaS isolation — this deployment's model is one
  gateway instance per federation operator (self-hosted), not multiple
  organizations sharing one deployment. Not a gap unless that model
  changes.
- Rate limiting / DoS protection on the backend's own API — not
  evaluated yet; not clear it's actually needed before #1-#6, revisit
  once real auth exists (rate limiting an unauthenticated demo endpoint
  is a different problem than rate limiting a real login).
