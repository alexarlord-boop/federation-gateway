# Progress

Current state, not a changelog — `git log` has full history. Read this at
the start of a session; update it before a substantial one ends.

## Current state

All 13 compose services (`ui`, `backend`, `lighthouse`, `lighthouse2`,
`mesh-ta`, `mesh-ia`, `mesh-ia2`, `mesh-leaf-op`, `mesh-leaf-rp`,
`mesh-leaf-multi`, `mesh2-ta`, `mesh2-ia`, `mesh2-leaf-op`) are up and
healthy, spread across two docker networks (`default` + `mesh2net`,
`backend` on both — see `docs/FEDERATION-TOPOLOGY.md`). Every LightHouse
node's admin API now enforces real auth (`api.admin.users_enabled: true`
— run `python3 scripts/bootstrap-lighthouse-admin-users.py` once after
bringing the stack up, before any seed script). `docker compose up` now
fails closed without a real `.env` — run
`python3 scripts/generate-secrets.py` once first (one-time; see
`CLAUDE.md`'s First run). `scripts/backup.py`/`restore.py` exist for
snapshotting/restoring `backend.db` + every LightHouse instance's DB and
signing keys (`docs/BACKUP-RESTORE.md`). LightHouse is now pinned at
`0.22.3` — after `docker compose up`, `python3
scripts/migrate-lighthouse-config.py` must run once per instance
(`CLAUDE.md` hard constraint #13) or every public federation endpoint
404s. Full e2e suite (90 passing + 8 pre-existing, testbed-dependent
skips), full `mesh-tests` suite (25 tests), and full backend pytest suite
(118 tests) all green as of the last verification pass, run against the
live stack post-upgrade.

## Recently completed

- **Adopted LightHouse 0.22.3 as the pinned image.** Upstream fixed four
  bugs this repo had filed (`docs/KNOWN-ISSUES.md` Bugs 5-8: blocked
  subordinates still resolving, trust mark owner `entity_id` not
  releasable on delete, expired marks reported as `invalid` instead of
  `expired`, `constraints` PUT freezing metadata policy) — verified each
  live against the new image in an isolated git worktree before touching
  anything real, not just trusting the upstream report. Verifying the
  upgrade surfaced a genuinely undocumented breaking change: 0.22.x reads
  federation endpoint config from its own database, not live from
  `config.yaml`, so a fresh container 404s on every public endpoint until
  a one-time `lhmigrate config2db` runs. New `scripts/migrate-
  lighthouse-config.py` automates that (same idempotent,
  `bootstrap-lighthouse-admin-users.py`-shaped pattern) and is now wired
  into every documented setup sequence. Flipped the two mesh-tests that
  used to assert the pre-fix buggy behavior to assert the spec-correct
  one. Verified in the worktree (mesh-tests 25/25 stable across repeat
  runs, e2e BFF 26/26, e2e proxy 90/98) before adopting the pin for real;
  then backed up the live demo stack (`scripts/backup.py`), upgraded it
  in place, re-ran the migration and the full test suite against it
  directly — all green, all pre-upgrade federation data (subordinates,
  trust marks, signing keys) intact.


- **Deployment docs — PRODUCTION-READINESS.md #7 (last item)**: new
  `docs/DEPLOYMENT.md` — pointing the same `ui`+`backend` app at a real
  LightHouse instance instead of the bundled demo mesh, synthesizing
  #1–#6 into one guide rather than adding new mechanism (docs-only, no
  code). Explicit about only `ui`/`backend` being "this app" — the
  Docker-Compose-not-Kubernetes constraint (#11) is about LightHouse's
  `entity_id` identity binding specifically, doesn't apply to the
  gateway itself. `docs/GETTING-STARTED.md` and `README.md` both got a
  one-line pointer to it. `PRODUCTION-READINESS.md` #1–#7 are all now
  closed (#2's forced-rotation/disable-account gap and #4's/#5's
  documentation-only scope remain exactly as those items describe —
  "closed" means "scoped and shipped what was chosen," not "zero
  remaining risk," and each item's own text says so).

- **Bootstrap admin credential — PRODUCTION-READINESS.md #2**:
  `backend/app/db/seed.py` no longer hardcodes `admin123` — reads
  `ADMIN_BOOTSTRAP_PASSWORD`, fail-closed in `docker-compose.yml` like
  #5's other secrets, but deliberately *not* randomized by
  `generate-secrets.py` (it's a human-typed login, demo/tests need it
  predictable, unlike #5's machine-to-machine secrets) — `.env.example`
  keeps it as the visible, documented `admin123` default. Forced
  password rotation / a disable-after-bootstrap flow explicitly not
  built (user's choice — smallest of the three options the item
  originally listed). Found and fixed a real pre-existing CI gap along
  the way: `.github/workflows/ci.yml`'s e2e jobs ran `docker compose up`
  with no `.env`/secrets step at all — harmless before #5, would have
  hard-failed the moment these commits were ever pushed. Verified live:
  full pytest (118) on a fresh per-test DB, a standalone fresh-DB
  container proving a custom `ADMIN_BOOTSTRAP_PASSWORD` actually
  overrides the default (old default rejected, custom one accepted),
  full stack rebuilt with the existing seeded DB unaffected, BFF e2e
  (26/26) and full e2e (90/98, 8 pre-existing skips) green.

- **Backup/restore — PRODUCTION-READINESS.md #6**: new `scripts/backup.py`
  snapshots `backend.db` + every LightHouse instance's `lighthouse.db` +
  signing keys into one timestamped `tar.gz`, using SQLite's online
  backup API (safe with the stack up, not a raw file copy). New
  `scripts/restore.py` reverses it — refuses to run while the stack is
  up (no override), requires `--force`, replaces DBs wholesale but only
  adds key files (never deletes one present locally but absent from the
  backup). New `docs/BACKUP-RESTORE.md`. Where the archive is stored and
  how often it runs are explicitly the deployer's call, not built here —
  same reasoning as #4/#5. Verified live, not just read: backed up the
  real running demo stack, brought it down, restored, confirmed
  identical data *before* bringing the stack back up, then confirmed
  login/proxy/a live trust-chain `/resolve` all still work post-restore
  (proving the restored keys still produce valid signatures). Full
  `mesh-tests` (25/25) and BFF e2e (26/26) green afterward. Also fixed
  two stale doc-index misses noticed along the way — `docs/TLS.md` was
  never added to `README.md`'s or `CLAUDE.md`'s topic-doc lists when #4
  landed.

- **Secrets management — PRODUCTION-READINESS.md #5**: `docker-compose.yml`
  no longer has fallback defaults for `LIGHTHOUSE_ADMIN_*`/
  `LIGHTHOUSE2_ADMIN_*`/`OIDC_ENCRYPTION_KEY`/`JWT_SECRET` (the last one
  newly found — was silently defaulting to a hardcoded string in
  `backend/app/auth/security.py`, not previously in `docker-compose.yml`
  at all) — `docker compose up` fails closed without a real `.env`. New
  `scripts/generate-secrets.py` writes one for local/demo use; every doc
  documenting `docker compose up` updated to run it first, plus a new
  `CLAUDE.md` hard constraint (#12). Two real bugs found and fixed while
  verifying against the already-bootstrapped live stack: rotating
  `LIGHTHOUSE_ADMIN_PASSWORD` doesn't rotate the LightHouse-side user
  `bootstrap-lighthouse-admin-users.py` already created (fixed the live
  stack by hand, added a warning to `generate-secrets.py --force`); and
  `mesh-tests`/the seed scripts/`generate_traffic_and_stats.sh` all run
  on the host, not through `docker compose`, so they were silently
  falling back to the old hardcoded credential the moment `.env`'s
  generated password diverged from it (fixed with a shared
  `.env`-loading helper). Full Vault/cloud secrets-manager integration
  explicitly not built — same reasoning as #4, picking a vendor would
  commit this repo to a deployment shape it doesn't know. Verified live:
  full stack rebuilt with real secrets, credentials rotated and
  confirmed old ones rejected, full `mesh-tests` (25/25), all host
  scripts clean, full e2e (26 `@bff` + 90 `@proxy`), full backend pytest
  (118).
- **TLS everywhere — PRODUCTION-READINESS.md #4**: scoped to
  documentation-only by explicit user choice — new `docs/TLS.md`
  explains why (LightHouse's `entity_id` is the entity's cryptographic
  identity, not a connection address, so LightHouse-to-LightHouse TLS
  can't be retrofitted onto the already-seeded demo mesh without
  invalidating every trust chain in it) and lays out real guidance
  per hop for whoever deploys this for real. No code changed. Also
  fixed a stale item-number cross-reference in `docker-compose.yml`
  (`OIDC_ENCRYPTION_KEY`'s comment pointed at #4 instead of #5, left
  over from the #2 bootstrap-admin-credential insertion).
- **LightHouse admin API auth — PRODUCTION-READINESS.md #3**: turned on
  `api.admin.users_enabled: true` in all 11 `config.yaml` files.
  LightHouse's actual auth mechanism has no docs anywhere (external Go
  binary) — reverse-engineered by extracting an embedded OpenAPI spec
  from strings in the `oidfed/lighthouse` binary itself, then confirmed
  live: `users_enabled` alone enforces nothing until a user exists;
  while zero users exist, `POST /api/v1/admin/users/` is itself
  unauthenticated (bootstrapping), and the instant one is created, every
  admin endpoint requires real Basic Auth. New
  `scripts/bootstrap-lighthouse-admin-users.py` creates that one user
  per instance using the credentials already flowing through this
  codebase, so `backend/app/routers/proxy.py` and the backend's own
  capability prober needed zero code changes — they already sent this
  exact Basic Auth on every request. Four direct callers that didn't
  (`scripts/seed-demo.py`, `seed-mesh.py`, `seed-mesh2.py`,
  `generate_traffic_and_stats.sh`, `mesh-tests/_lighthouse_client.py`)
  got it added. Verified live on the full stack: pre-bootstrap open →
  bootstrap → 401/200 enforcement → idempotent re-run → all four scripts
  re-run clean → full `mesh-tests` (25/25) → full e2e (26 `@bff` + 90
  `@proxy`) → backend restarted mid-session, still authenticates
  correctly. `docs/FEDERATION-TOPOLOGY.md` updated with the new
  bootstrap step in every documented setup sequence.
- **Real user login via OIDC — PRODUCTION-READINESS.md #1**: replaced the
  fake "Sign in with OIDC" stub (`LoginPage.tsx` used to just log in as
  the demo admin) with a real authorization-code+PKCE flow against
  external IdPs, built on the previously-unwired `OIDCProvider` model.
  New admin UI at `/identity-providers` (super_admin-only) to configure
  providers; login page shows a real "Sign in with {provider}" button
  per enabled provider once one exists. New SSO users are JIT-provisioned
  with no RBAC role (manual assignment via the existing Users page, by
  design — no claim/group auto-mapping). Local password login stays as
  a fallback; SSO accounts can no longer log in with a password. Client
  secrets encrypted at rest (Fernet, `OIDC_ENCRYPTION_KEY` — same
  dev-default caveat as the LightHouse admin credentials, tracked under
  PRODUCTION-READINESS.md #4). `authlib` added as a new backend
  dependency (ID-token/JWKS validation is exactly the kind of
  security-critical code better left to a maintained library). 11 new
  backend tests using `respx` to mock the IdP and a forged, validly-signed
  ID token (no live IdP available to test against yet — flagged as a
  follow-up); full 116-test backend suite and the BFF e2e tier both green
  afterward. Verified live via Playwright screenshots: provider creation,
  the login page's real SSO button, and the Users page's new Auth
  (Local/SSO) column. Then verified against a **real Keycloak instance**
  (throwaway `docker run` container, not part of the compose stack) —
  full real browser redirect → real login form → callback → dashboard,
  which caught two real bugs the mocked tests couldn't: nginx's `$host`
  vs `$http_host` dropping the port from forwarded requests (broke the
  OIDC `redirect_uri`, `Dockerfile`), and a pre-existing
  `seed_rbac_data()` bug that silently reverted manually-assigned RBAC
  roles on every backend restart (`backend/app/db/rbac_seed.py`). Both
  fixed, both covered by new regression tests (118 backend tests total
  now), both confirmed fixed live by restarting the backend mid-session
  and re-checking role persistence.
- **UI for Trust Marked Entities Listing (§8.5) and Federation Historical
  Keys (§8.7)**: the two capabilities `mesh-tests/` covers that had no UI
  before. `historical_keys` enabled in every `config.yaml` in this repo
  (was only on `mesh-leaf-rp`, added for last session's key-rollover
  tests). Trust mark listing lives inline in Trust Marks → Issuance → each
  spec's Subjects table (not a separate page) — a live/not-live badge per
  subject plus a summary line, cross-referencing the public
  `/trust_mark/list` endpoint against the admin-configured subjects, the
  same operational signal `mesh-tests` found matters (a subject can be
  configured `active` but not actually live if blocked, or just not
  freshly re-issued). Historical keys get a new card in Settings → Keys &
  KMS, styled like the existing Public Keys table rather than a raw JSON
  dump. Both use the raw-request escape hatch (`__request(OpenAPI, {...})`,
  same pattern `useTrustMarkIssuance.ts` already uses) rather than the
  generated client — these are OIDF federation protocol endpoints, not
  part of `Federation Admin OpenAPI.yaml`'s admin-API scope, so adding
  them there would misrepresent that file's purpose. Verified live via a
  throwaway Playwright script (screenshotted both features against real
  seeded mesh data, not just typecheck) — one real side effect caught and
  fixed in the process: rotating `mesh-ia`'s key for the historical-keys
  screenshot went stale against `mesh-ta`'s stored record of it (the same
  issue `test_key_rollover.py` covers), re-synced and confirmed resolution
  recovered before finishing. `npx tsc --noEmit`, `eslint`, `npm run build`
  all clean; 25/25 `mesh-tests` still green afterward.
- **`mesh-tests/` — mesh integration pytest suite, `MESH-TESTING-PROGRESS.md`
  now fully complete**: a new top-level suite (deliberately sibling to
  `backend/tests/`, not nested in it — see its `conftest.py` docstring
  for why) covering every checklist item that a self-contained
  registry+LightHouse deployment could reasonably prove: B1 (metadata
  policy), B2 (constraints enforcement — `naming_constraints` proven
  live, the other two sub-mechanisms confirmed correct in source but
  need topology beyond what's justified building for their own sake),
  C4 (trust mark delegation), C5 (trust marked entities listing), C6
  (trust mark revocation/expiry), D1 (federation historical keys
  endpoint — enabled it on `mesh-leaf-rp`, wasn't turned on anywhere in
  this repo before), D2 (key rollover), D3 (subordinate revocation
  propagating to resolution), §10.3 (choosing among multiple valid trust
  chains) and "entity with redundant/multiple parents" (added `mesh-ia2`,
  a second Intermediate sibling to `mesh-ia`, and `mesh-leaf-multi`,
  registered under both), §10.4 (trust chain expiration), and the
  standalone Resolver role (§17.3/§10.6 — turned out to need no new node
  at all, just any uninvolved entity's existing `/resolve` endpoint).
  Runs on the host against published localhost ports, skips cleanly if
  the stack isn't up. `mise run test:mesh-integration` to run it (25
  tests, all green, confirmed idempotent across repeated full runs).
  Found four real, confirmed LightHouse bugs along the way: `/resolve`
  doesn't honor a subordinate's `blocked` status at all (filed upstream);
  deleting a trust mark owner doesn't release its `entity_id` for reuse;
  an expired trust mark is reported as `invalid` instead of the
  spec-defined `expired`; and setting per-subordinate constraints
  silently freezes that subordinate's metadata policy against future
  general-policy changes (found while fixing a test that broke — chasing
  it down corrected an earlier wrong belief that `docker compose restart`
  clears LightHouse's caching/state, which it does not; see
  `MESH-TESTING-PROGRESS.md`'s investigation notes for the full story).
  All four tracked in `docs/KNOWN-ISSUES.md` as bugs 5-8, three not yet
  filed upstream. Two narrow, low-priority gaps remain genuinely
  untestable without further topology this repo doesn't obviously need
  for its own sake (`max_path_length`, `allowed_entity_types`) — see
  `MESH-TESTING-PROGRESS.md`'s "Suggested next order" for exactly what
  each would need if either area comes back into focus later.
- **mesh2 + interfederation testing**: a second, fully independent
  LightHouse mesh (`mesh2-ta` → `mesh2-ia` → `mesh2-leaf-op`, no shared
  root with the first mesh) plus `scripts/seed-mesh2.py`. Confirmed live
  the one real distinction OIDFed draws for cross-federation trust: an
  issuer from mesh 1 (`mesh-ia`) can mark a mesh 2 entity directly (trust
  marks are issuer-authoritative, no chain needed — status check returns
  200), while resolving a trust *chain* from that same entity through
  mesh 1's anchor correctly fails (`404 invalid_trust_chain` — no spec
  mechanism crosses an unrelated root).
- **mesh2 network/credential separation**: moved `mesh2-*` onto their own
  docker network (`mesh2net`, isolated from `default`) with distinct admin
  credentials (`LIGHTHOUSE2_ADMIN_*`) — the initial mesh2 shared both with
  mesh1, which undersold the interfederation demo. `backend` joins both
  networks (deliberate: one app still administers both). Confirmed live:
  `mesh-ia` genuinely cannot resolve `mesh2-ta` by hostname anymore, yet
  the trust-mark status check above is completely unaffected (still 200) —
  proof the mark is a portable signed assertion, not something needing
  live connectivity between issuer and subject infrastructure. The
  negative-path `/resolve` error also turned out unaffected either way
  (LightHouse never needed to reach the subject for that check).
- **Fixed a real tenant-id collision bug found while verifying the above**:
  `db/seed.py` derived each instance's `Tenant.id` from only the *last*
  hyphen segment of its instance id (`item.id.split('-')[-1]`) — silently
  correct for `ta-1`/`ta-2` (→ `tenant-1`/`tenant-2`), but `mesh-ta`/
  `mesh2-ta` and `mesh-ia`/`mesh2-ia` both derived the same short id, so
  each backend startup after mesh2 was added silently overwrote
  `mesh-ta`'s/`mesh-ia`'s tenant record with mesh2's data (whichever
  config entry seeded last "won") — a real, already-live data-corruption
  bug, not just a mesh2-specific one. Fixed to use the full instance id
  (`tenant-mesh-ta`, `tenant-ta-1`, etc. — no collisions possible);
  updated the handful of tests that hardcoded the old `tenant-1`/
  `tenant-2` literals, and cleaned the two orphaned garbage rows out of
  the local dev `backend.db` (verified nothing referenced them first).
- **Harness engineering cleanup**: added this file and `CLAUDE.md`, moved
  `ARCHITECTURE.md`/`CAPABILITY-DISCOVERY.md`/`KNOWN-ISSUES.md`/
  `GETTING-STARTED.md` into `docs/`, split the 782-line `README.md` into a
  ~200-line entry point plus 4 new focused docs (`TESTING.md`,
  `LOCAL-DEVELOPMENT.md`, `FEDERATION-TOPOLOGY.md`,
  `BACKEND-IMPLEMENTORS.md`).
- **Small LightHouse mesh**: a real 2-hop multi-instance federation
  (`mesh-ta` → `mesh-ia` → `mesh-leaf-op`/`mesh-leaf-rp`) for testing
  actual trust-chain resolution and trust-mark delegation, plus
  `scripts/seed-mesh.py` to wire it up. Found and fixed 3 real bugs along
  the way: a latin-1 crash in the proxy's response headers, each
  instance's stored `entity_id` defaulting to `public_base_url` instead
  of its real self-asserted identity, and `lighthouse2/data` never having
  been gitignored (a real private signing key had been committed).
- **Sidebar rework**: fixed-width icon rail instead of collapsing to
  `width: 0`, a Radix Tooltip missing a `Portal` (was silently broken
  app-wide), several rounds of animation/alignment fixes, and Trust
  Marks' role-legend cards replaced with tab tooltips.
- **Trust-mark spec compliance**: `trust_mark_status` is POST +
  `application/x-www-form-urlencoded` per the actual OIDF text, not GET —
  see `docs/KNOWN-ISSUES.md` for the full story including two confirmed
  upstream LightHouse bugs found via the real `testbed.oidf.lab.surf.nl`
  federation.

## Known blockers

- **`backend/.venv` is stale**: Python 3.9 present, project pinned to
  3.11. Local `pytest` results can't be trusted — see `docs/TESTING.md`
  for the workaround (run tests against the built Docker image instead).
  Not yet fixed; unrelated to any in-progress feature work.
- Everything else open is tracked in `docs/KNOWN-ISSUES.md`, not here —
  that file is the maintained, evidence-based list of gaps and upstream
  issues. Production-deployment gaps (real login, TLS, secrets, LightHouse
  admin auth) are still detailed there, now with priority order and
  status tracking on top in `PRODUCTION-READINESS.md`.

## Next steps

`MESH-TESTING-PROGRESS.md` is complete — no mesh testing work is
currently planned. If `max_path_length` or `allowed_entity_types`
constraint enforcement becomes a priority later, see that file's
"Suggested next order" for exactly what topology each would need
(neither is unblocked by the `mesh-ia2` sibling added for multi-parent
testing — that was a corrected assumption, see the file's investigation
notes).

`PRODUCTION-READINESS.md` — the priority-ordered checklist (user's own
ranking, 2026-08-19) for what's left before this deployment is safe to
hand to a real federation admin — is now fully checked off (#1 real user
login, #2 bootstrap admin credential, #3 LightHouse admin API auth, #4
TLS everywhere, #5 secrets management, #6 backup/restore, #7 deployment
docs). No open PRODUCTION-READINESS.md items remain as of 2026-08-20.
That doesn't mean zero remaining risk — several items were deliberately
scoped narrower than "fully solved" (see each item's own text): #2 has
no forced password rotation or account-disable flow, #4 and #5 are
documentation/fail-closed-only rather than full TLS/secrets-manager
integration, and the "Tracked, not actionable here" section still has
LightHouse's `/resolve`-ignores-blocked-status bug as an upstream
handover item. No new priority list has been set since — check back with
whoever's driving this next on what (if anything) comes after.
