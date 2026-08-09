# Progress

Current state, not a changelog — `git log` has full history. Read this at
the start of a session; update it before a substantial one ends.

## Current state

All 11 compose services (`ui`, `backend`, `lighthouse`, `lighthouse2`,
`mesh-ta`, `mesh-ia`, `mesh-leaf-op`, `mesh-leaf-rp`, `mesh2-ta`,
`mesh2-ia`, `mesh2-leaf-op`) are up and healthy, spread across two docker
networks (`default` + `mesh2net`, `backend` on both — see
`docs/FEDERATION-TOPOLOGY.md`). Full e2e suite (90 passing + 8
pre-existing, testbed-dependent skips) and full backend pytest suite (105
tests) both green as of the last verification pass.

## Recently completed

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
  admin auth) are parked in its own section there.

## Next steps

Working through `MESH-TESTING-PROGRESS.md` — a checklist of OIDF
spec-defined flows (metadata policy enforcement, constraints enforcement,
trust mark delegation/listing/revocation, key rollover, multi-parent
entities) mapped against what the `mesh-*`/`mesh2-*` setup currently
proves versus what's still untested. No commits from this session have
been pushed to `origin/main` (standing rule — see `CLAUDE.md`).
