# Known Issues & Product Gaps

Discovered by running gap-finding e2e tests against the live stack.  
Tests are in `e2e/tests/entity-detail.spec.ts`, `settings-mutations.spec.ts`, `rbac-enforcement.spec.ts`, `trust-marks-crud.spec.ts`.

---

## 🛠️ Fixable by us (UI / BFF code changes only)

These are bugs or missing features in our own codebase — no LightHouse or OIDFed spec changes needed.

### 🔴 Critical — Incorrect API values (will produce HTTP 400)

- [x] ~~**`EntitiesPage` uses invalid status `'rejected'`**~~  
  **Fixed:** replaced `'rejected'` with `'inactive'`; removed "Rejected" filter option. (`src/pages/EntitiesPage.tsx`)

- [x] ~~**`EntityDetailPage` Lock button sends invalid status `'locked'`**~~  
  **Fixed:** status change now uses `'blocked'`/`'active'`/`'inactive'`. Button label updated to "Block/Unblock". (`src/pages/EntityDetailPage.tsx`)

### 🟠 High — Missing UI for existing backend functionality

- [x] ~~**Entity detail JWKS tab is read-only**~~  
  **Fixed:** `SubordinateJwksTab` component added with per-key delete buttons and Add JWK textarea, wiring `addJwk`/`deleteJwk` from `useSubordinateKeys`. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**Entity detail Metadata tab is read-only**~~  
  **Fixed:** `SubordinateMetadataTab` component with "Edit JSON" toggle, Textarea editor, JSON validation, and Save/Cancel via `updateMetadata` from `useEntityDetail`. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**No UI to change status of `inactive` entities**~~  
  **Fixed:** status dropdown now shown for `active`, `blocked`, `inactive`, and `pending` entities with contextual options. (`src/pages/EntityDetailPage.tsx`)

### 🟡 Medium — UX & accessibility

- [x] ~~**Delete button on entity detail has no accessible label**~~  
  **Fixed:** added `aria-label="Delete entity"` to the destructive icon button. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**Entity status filter is client-side only — no URL deep-link support**~~  
  **Fixed:** `statusFilter` now synced with `?status=` URL search param via `useSearchParams`. (`src/pages/EntitiesPage.tsx`)

- [x] ~~**Lock/Unlock requires two clicks (confusing UX)**~~  
  **Fixed:** dropdown now contains multiple contextual actions (Block, Set Active, Set Inactive) so the extra click is justified; removed single-item redundancy. (`src/pages/EntityDetailPage.tsx`)  
  The Lock button opens a DropdownMenu that contains a single menu item to actually change the status. For a single-action button, this adds unnecessary friction. Consider a direct confirmation dialog instead.

- [x] ~~**Stats page only used 2 of 8 available LightHouse stats endpoints**~~  
  **Fixed:** added `stats/top/user-agents`, `stats/top/clients`, `stats/top/params`, `stats/top/countries`, `stats/latency` (full p50–p99/min/max), and a `stats/timeseries`-backed "Requests Over Time" line chart (Total Requests + Errors, `useStatsTimeseries` with `keepPreviousData` so range switches don't flash) to `useStats.ts` and `StatsPage.tsx`, plus a CSV/JSON export button backed by `stats/export`. `stats/top/countries` gracefully shows an empty state (no GeoIP configured) rather than being hidden. `stats/daily` is still not wired into the Stats page — it was non-functional upstream at the time (now fixed, see below), and wiring it up is a separate follow-up, not done here. Chart colors validated with the dataviz skill's palette validator in both light and dark mode; `--destructive`'s dark value failed contrast as a thin line, so added a dedicated `--chart-line-2` token instead of reusing it.

- [x] ~~**`docker-compose.yml` was pinned to the stale `oidfed/lighthouse:latest` tag**~~  
  **Found by:** being told the two bugs below were "already fixed" — they weren't, on the image we had. Docker Hub showed `latest` was last pushed 2026-06-15 while `main` and several `sha-*` builds went out as recently as 2026-07-09 — `latest` isn't kept in sync with actual HEAD. **Fixed:** re-pinned both `lighthouse` and `lighthouse2` services to `oidfed/lighthouse@sha256:689b121...` (the real newest build, currently tagged `main`). Note: `lighthouse_version` in the entity config still reports `0.21.0` on this build even though it contains new fixes — the version claim can't be used to tell builds apart, only the image digest can. Caveat: `main` is a floating branch tag, not a stable release — worth watching for a proper versioned tag upstream.

- [x] ~~**`stats/daily` returns empty; unmatched-route 404s logged as 200**~~ (both filed upstream, both now fixed)  
  Filed as formal bug reports against `sha256:689b121...` (repro steps, expected/actual response bodies, likely root cause). Maintainer shipped fixes in a later build; re-verified both live rather than trusting the claim. **404 mis-logging:** confirmed fixed on the first try — a real bogus-path request now correctly shows up as `"404"` in `requests_by_status` instead of being folded into `"200"`. **`stats/daily`:** the first recheck looked *still* broken (`{"daily": []}`) — but that test used a brand-new container with only same-day traffic, and it turns out `daily` only returns **completed, rolled-up days**, unlike `timeseries` which aggregates live. Retested against a copy of the real persisted multi-day data (not the live dev stack) with a date range covering several genuinely complete past days, and `daily` returned a correct, rich per-day/per-endpoint/per-status breakdown matching `timeseries` totals for the same range — the original methodology, not the fix, was the problem the second time around. **Re-pinned** both `lighthouse` and `lighthouse2` to `oidfed/lighthouse@sha256:f03d85e8...` (pushed 2026-07-24, `main`). Full e2e suite (90+26 passed) green on the new image; `lighthouse_version` still reports `0.21.0` per the caveat above.

- [x] ~~**Chain Inspector could only inspect entities registered as our own subordinates**~~  
  **Fixed:** added an "Any Entity" mode (`src/pages/ChainInspectorPage.tsx`) that fetches any real entity's own `.well-known/openid-federation` directly via `GET /api/v1/admin/resolve` (backend/app/routers/resolve.py, pre-existing, previously only used by the registration wizard) — SSRF-guarded (https-only, private/loopback IPs blocked), works around real federation hosts not setting browser CORS headers. Shows authority hints as clickable chips to walk the real chain, and lists any trust marks embedded in the entity's config. Verified live against `testbed.oidf.lab.surf.nl` (SWAMID, SURFconext, HAKA, eduGAIN root). The original "Via Trust Anchor" fetch/resolve mode (scoped to our own subordinates) is preserved as a second tab.  
  **By-design limitation, not a bug:** this SSRF guard (and `/trust-mark-status`'s, same guard) means "Any Entity" mode and the live status checker can't reach the local mesh added in `docker-compose.yml` (`mesh-ta`/`mesh-ia`/`mesh-leaf-op`/`mesh-leaf-rp`, see README) — those entity_ids are plain-http docker-network hostnames, correctly rejected by the https-only + private-IP checks. Use the "Via Trust Anchor" tab (proxy-based, unguarded) against `mesh-ta`/`mesh-ia` instead — that's how `scripts/seed-mesh.py`'s printed verification commands work.

- [x] ~~**No way to verify a trust mark is genuine or still valid — "signature NOT verified" was a dead end**~~  
  **Fixed:** added `TrustMarkVerifier` (shared by the JWT detail dialog in My Trust Marks and the new Chain Inspector), which implements the actual spec-defined verification mechanism (OIDF §8.3): fetch the issuer's own entity config to find its `federation_trust_mark_status_endpoint`, then ask that endpoint directly whether the mark is still active — no local signature check needed, the issuer is authoritative. New backend endpoint `GET /api/v1/admin/trust-mark-status` (same SSRF guard as `/resolve`). Verified end-to-end against a real mark: eduGAIN issues `https://edugain.org/member` to SWAMID on the real testbed; clicking "Verify Live Status" returns "Active — confirmed by issuer".  
  Also fixed the underlying claim-name gap this surfaced: real marks in the wild use three different claim names for the trust mark type — `trust_mark_id` (real eduGAIN-issued marks), `trust_mark_type` (LightHouse), `id` (older/draft tooling). `getTrustMarkTypeId()` in `jwt-utils.ts` now reads whichever is present; previously only `trust_mark_type` was read, so any real externally-issued mark's type would render blank.

- [x] ~~**Trust Marks page was a flat, confusing tab list with no indication of which OIDFed role each tab represents**~~  
  **Fixed:** added a `RoleLegend` (Owner/Issuer/Subject/Relying Party, each mapped to its tab — Relying Party links out to Chain Inspector) at the top of the page, reordered tabs to the natural lifecycle order (Federation Trust Marks → Issuance → My Trust Marks), added role suffixes to each tab label, and made the active tab URL-addressable (`?tab=federation|issuance|self`, same pattern as `EntitiesPage`'s `?status=`). Replaces the old flat paragraph banner that just repeated the tab names without explaining the underlying roles.

- [x] ~~**No shortcut to issue a trust mark from an entity's own detail page**~~  
  **Fixed:** extracted the issuance dialog into a reusable `IssueTrustMarkDialog` (`src/components/trust-marks/`) with an optional `lockedEntityId` prop, and added an "Issue Trust Mark" button to `EntityDetailPage`'s header actions (gated on the `trust_mark_issuance` capability + permission) that opens it pre-filled with the entity's own ID — no more navigating away to Trust Marks → Issuance → find spec → Add Subject.

- [x] ~~**Free-text trust mark type fields let you create issuance specs or self-issued marks for unregistered types**~~  
  **Fixed:** added `TrustMarkTypeSelect`, a dropdown sourced from the real registered-types list (`useTrustMarkTypes`), and used it in place of the free-text `Input` in both the "Add Spec" dialog and "Self-Issued" mode — you can now only pick a type that actually exists in the registry, which is a precondition for the mark to resolve over the public protocol later (see the "self-issuance doesn't validate the type is registered" gap this closes). Shows a helpful empty state linking to Federation Trust Marks → Types when none exist yet. The "Type + Issuer" external-issuer mode intentionally keeps free text — that type belongs to someone else's registry, not ours.  
  **Found while fixing this:** the pre-existing correctness e2e test's cleanup helper had been calling `${APP_URL}/api/v1/admin/trust-marks/*` directly instead of through the gateway's `/api/v1/proxy/{instanceId}/...` hop — a latent bug that silently 404'd on every run, meaning cleanup never actually ran and ~40 orphaned test trust-mark types had quietly accumulated in the local dev instance's registry over the course of this project. Fixed the test and cleaned up the accumulated data.

- [x] ~~**Audit log recorded that an action happened but not what changed**~~  
  **Fixed:** the `details` column existed on `AuditLog` (schema, `record()` param) but was never populated — `proxy.py` already read the mutating request's body into memory and just never passed anything through. Now captures the **response body** (not the request body — it reflects the actual resulting state: server-assigned IDs, computed defaults, not just what the client asked for) for every audited mutation, redacted before storage via a pattern-based denylist (`password`, `secret`, `private_key`, `api_key`, `*_token`, `delegation_jwt`, `credential`, `authoriz*`, `admin_auth`, case/separator-insensitive) and capped at 8000 chars to bound storage growth from large payloads (JWKS blobs, metadata policy documents). Added a "Details" column + `View` action to `AuditLogPage` opening a `JsonView` dialog of the captured (redacted) response.  
  **Fixed as a direct consequence:** `resource_id` extraction previously took the last URL path segment, which is wrong for creates — `POST .../issuance-spec` recorded `resource_id: "issuance-spec"` (the collection name) since the real assigned ID only exists in the response. Now prefers the response body's own `id` field when present.  
  Verified end-to-end against real LightHouse responses: issuing a trust mark correctly captures `{id, entity_id, status, created_at, updated_at}`; creating an issuance spec with a `delegation_jwt` correctly shows `"delegation_jwt": "[REDACTED]"` while leaving the trust mark type and other non-sensitive fields intact.

- [x] ~~**`backend.db` (users, RBAC roles, audit logs) wasn't persisted — every container rebuild silently wiped it**~~  
  **Found by:** noticing Audit Log pagination had disappeared. Root cause: `docker-compose.yml`'s `backend` service had no volume for its SQLite file — `DEFAULT_DB_PATH` resolves to `/backend.db`, entirely inside the container's writable layer. Any `docker compose up --build backend` (routine during this whole session) silently reset it to a fresh, re-seeded DB, discarding hours of accumulated audit history, registered users, and RBAC customizations with no warning. Explains why the pagination controls (gated on `total > PAGE_SIZE`) vanished: the count had reset to near-zero, not a UI bug.  
  **Fixed:** added `./backend/data:/data` volume + `DATABASE_URL: sqlite:////data/backend.db` env var, matching the existing `lighthouse/data` bind-mount convention. Verified by rebuilding the backend twice in a row and confirming an audit entry survived both. One-time cost: the transition itself still wipes whatever was in the old container-internal path — but every rebuild from here on preserves data.

- [x] ~~**Audit Log used Prev/Next page-button pagination instead of infinite scroll**~~  
  **Fixed:** `AuditLogPage` now uses `useInfiniteAuditLogs` (`src/hooks/useAuditLogs.ts`, built on React Query's `useInfiniteQuery`) with an `IntersectionObserver` sentinel that calls `fetchNextPage()` as the user scrolls near the bottom of the table. Changing a filter (resource type, action) changes the query key, so React Query automatically discards the accumulated pages and restarts from page 1 — no manual page-reset code needed, and no risk of appending results fetched under a stale filter. Verified against real accumulated audit data (28 entries): initial load shows 20, scrolling loads the remaining 8, and switching the resource-type filter correctly resets to a fresh 20-or-fewer set rather than appending. As a side effect, the `userSearch` text filter (still client-side — there's no server-side user search endpoint) now matches across every page loaded *so far* instead of only the current page of 20, which is strictly better but still not a true full-dataset search until something further back has been scrolled to.  
  **Deliberately not done:** infinite scroll for the Entities page. LightHouse's `/subordinates` endpoint (`Federation Admin OpenAPI.yaml`, confirmed directly against the spec) takes only `entity_type`/`status` query params and returns a flat, unpaginated array — no `page`/`page_size`/`total`, so there is no server-side page to fetch incrementally. Entities are already fetched and filtered 100% client-side; "infinite scroll" there would only be DOM virtualization of an already-fetched list, a different (and unrequested) feature.

---

## 🤝 Requires LightHouse / OIDFed team collaboration

- [ ] **eduGAIN testbed's `trust_mark_status` endpoint doesn't implement the finalized OIDF spec contract**  
  **Corrected finding** — the original note here ("neither is wrong per spec text") was wrong; re-verified by reading the actual normative OpenID Federation 1.0 spec text (§8.4.1/8.4.2) rather than assuming both real-world behaviors were equally valid. The spec is unambiguous: the request **MUST** be `POST`, `application/x-www-form-urlencoded`, with a single required `trust_mark` parameter; a successful response **MUST** be HTTP 200 with content type `application/trust-mark-status-response+jwt` — a signed JWT whose claims include `status` (`active`/`expired`/`revoked`/`invalid`). **LightHouse implements this correctly.** The real eduGAIN testbed root (`edugain.oidf.lab.surf.nl`) does not — it only accepts `GET ?sub=&trust_mark_id=` returning plain JSON `{"active": bool}`, a contract from an earlier, non-final draft of the spec. This is genuinely eduGAIN's gap, not ours — not fixable on our side.  
  **Also found while re-checking this, and fixed on our side:** `GET /api/v1/admin/trust-mark-status` (`backend/app/routers/resolve.py`) had three real spec-compliance misses of its own, despite ending up functionally correct against LightHouse by accident. It tried the non-compliant GET contract *first* and treated POST as a fallback, backwards from the spec's actual priority. Its POST fallback sent `Content-Type: application/json` instead of the required `application/x-www-form-urlencoded` (LightHouse tolerated it, so it never surfaced). And its status-JWT decoder only recognized `active`/`revoked`, so a real `expired` or `invalid` response would have incorrectly raised a parse error instead of resolving to `active: false`. **Fixed:** POST + form-urlencoded is now the primary path per spec; GET + `sub`/`trust_mark_id` is a documented last-resort fallback for non-compliant issuers like eduGAIN's testbed; all four spec status values are handled. Verified live against a real issued mark and real LightHouse: `POST` with `data-urlencode trust_mark=<jwt>` returns a correctly-typed `trust-mark-status-response+jwt` with `status: "active"`. 18 backend tests cover the new priority, both status endpoints' response shapes, and all four status values.

- [ ] **`/resolve` returns a valid trust chain for a `blocked` subordinate**  
  **Filed upstream** against `oidfed/lighthouse@sha256:f03d85e8...`. Found while building `mesh-tests/` (`MESH-TESTING-PROGRESS.md` item D3), against a real 2-hop federation with real signing keys, not mocked entities. Setting a subordinate's status to `blocked` (`PUT /api/v1/admin/subordinates/{id}/status`) is not honored by chain resolution: `GET /resolve?sub=...&trust_anchor=...` for that subordinate still returns HTTP 200 with a complete, correctly signed `trust_chain`, as if it were still `active`. Control check: `/list` *does* correctly exclude the same blocked entity — the status is stored and consulted elsewhere, just not during resolution.  
  **Evidence, corrected:** originally justified as "ruled out caching by restarting `mesh-ia` first" — that reasoning doesn't hold, see the metadata-policy entry below (`docker compose restart` does not clear LightHouse's persisted state at all, so it proves nothing about caching either way). The real, solid evidence is **static**: `go-oidfed/lib`'s `trustresolver.go` (backs `TrustResolver.ResolveToValidChains()`, what `/resolve` ultimately calls) has zero references to subordinate `status` anywhere in its chain-walking logic — it validates JWKS/signatures and hierarchy (`authority_hints`) but never queries status at all, unlike whatever backs `/list`'s filtering. A code path that never reads a field can't be affected by that field's staleness. Per OIDF Federation 1.0 §8.3, resolving a chain through a blocked entity should fail (4xx). Not fixable on our side — this is LightHouse's own resolution algorithm.

- [ ] **Deleting a trust mark type's owner doesn't release its `entity_id` for reuse**  
  Found while building `mesh-tests/test_trust_mark_delegation.py` (`MESH-TESTING-PROGRESS.md` item C4), against `oidfed/lighthouse@sha256:f03d85e8...`. `POST /api/v1/admin/trust-marks/types/{id}/owner` (create a trust mark owner) with a given `entity_id` succeeds once. `DELETE` on the same path returns 204, and afterward the owner is genuinely gone from every read path checked: `GET .../types/{id}/owner` → 404, `GET /api/v1/admin/trust-marks/owners` (global list) → `[]`, and directly probing `GET /api/v1/admin/trust-marks/owners/{1..5}` → 404 for all. Despite that, a second `POST` reusing the *same* `entity_id` (even a different jwks) 409s with `"trust mark owner already exists"` — immediately, within the same session, not just across restarts. A never-before-used `entity_id` succeeds normally, isolating this precisely to entity_id reuse after delete: some internal uniqueness record isn't cleaned up by the delete, orphaned and invisible to every list/get endpoint. Minor compared to the `/resolve` bug above (real deployments would rarely reuse a deleted owner's exact identifier), but real — not our test's mistake, confirmed by first reproducing it manually outside any test code. Worked around in the test suite by generating a fresh `entity_id` per test run rather than blocking on a fix. Not filed upstream yet.

- [ ] **Trust Mark Status: an expired mark is reported as `invalid`, not `expired`**  
  Found while building `mesh-tests/test_trust_mark_revocation_expiry.py` (`MESH-TESTING-PROGRESS.md` item C6), against `oidfed/lighthouse@sha256:f03d85e8...`. Confirmed against the actual normative spec text (§8.4.2, not recalled from memory), which defines the two values distinctly: `expired` = "the Trust Mark has expired"; `invalid` = "signature validation failed or another error was detected". Repro: `PATCH` an issuance spec's `lifetime` to `2` (seconds), fetch a fresh mark, wait past its `exp`, then `POST /trust_mark/status` for that mark — a real, validly signed mark whose only problem is that `exp` has passed comes back `status: "invalid"` instead of `status: "expired"`. Revocation (blocking a `TrustMarkSubject`) is unaffected and works correctly — an already-issued mark's status check correctly flips to `"revoked"`, and a blocked subject correctly gets 403 on a fresh issuance attempt — isolating this specifically to the expiry code path misclassifying itself as a generic validation failure. Lower priority than the `/resolve` bug (a consuming relying party would still correctly treat the mark as not-good, just with the wrong specific reason), not filed upstream yet.

- [ ] **Setting per-subordinate constraints permanently decouples that subordinate's metadata policy from the general policy**  
  Found while fixing `mesh-tests/test_metadata_policy.py` (`MESH-TESTING-PROGRESS.md` item B1) after it started failing depending on which other tests had run first in the same session — against `oidfed/lighthouse@sha256:f03d85e8...`.  
  **Mechanism (confirmed by inspecting `mesh-ia/data/lighthouse.db` directly via `sqlite3`, not guessed):** each row in the `subordinates` table has its own `metadata_policy` column, separate from the general policy (`key_values` table). A subordinate created without ever having a per-subordinate policy set has this column genuinely `NULL`, and in that state `/fetch` correctly computes the claim live from the general policy every time — this is what made early manual tests against fresh subordinates look like "no caching, always live." But `PUT /api/v1/admin/subordinates/{id}/constraints` — a call that has nothing to do with metadata policy — has the side effect of materializing that subordinate's `metadata_policy` column to a frozen snapshot of whatever the general policy evaluates to *at that moment*. Once frozen, further general-policy changes stop propagating to that subordinate's `/fetch`/`/resolve` output, and **the freeze survives `DELETE`ing the constraint again and survives restarting the container** (confirmed directly: identical stale response before and after `docker compose restart mesh-ia`, since the snapshot is persisted in SQLite, not an in-process cache). Isolated the exact trigger with a disposable throwaway subordinate: toggling `status` alone never triggers it; a single `constraints` `PUT` triggers it every time, immediately.  
  **Recovery:** `POST /api/v1/admin/subordinates/{id}/metadata-policies` ("copy general metadata policies to subordinate") re-syncs the frozen column to the current general policy — this is evidently the *intended* explicit-sync mechanism (mirrors `copyGeneralConstraintsToSubordinate`'s same pattern for constraints) rather than a workaround, and `mesh-tests/test_metadata_policy.py` now calls it explicitly after every policy change instead of assuming automatic propagation. The bug is specifically that an unrelated admin action (`constraints` `PUT`) silently triggers this freeze as an undocumented side effect. `mesh-leaf-rp` in this repo's own mesh is permanently in the frozen state as a result of this investigation (harmless — nothing in the demo depends on its metadata policy tracking live). Not filed upstream yet.

Items originally thought to need external collaboration turned out to be self-fixable:

- [x] ~~**Entity detail Policies tab broken for entities with no policies**~~  
  **Fixed:** `useSubordinateMetadataPolicies.ts` query function now catches 404 and returns `{}` — no LightHouse change needed. (`src/hooks/useSubordinateMetadataPolicies.ts`)

- [x] ~~**No "issue trust mark to entity" workflow**~~  
  **Fixed:** `IssuanceSpecsTab` + `SpecSubjectsPanel` were already fully implemented in `TrustMarksPage.tsx`; the **Issuance** tab is now visible when `trust_mark_issuance` is advertised by LightHouse (enabled in v0.20.0 manifest). Note: there is still no single-click "issue to entity" shortcut — you navigate Trust Marks → Issuance → select spec → Add Subject. GAP test updated to reflect this (direct-issue shortcut is a UX gap, not a blocker).

- [x] ~~**Authority hint validation silently drops error detail**~~  
  **Fixed:** `handleAdd` in `AuthorityHintsSection` now surfaces `err?.body?.detail` in the error toast so operators see actionable validation messages. (`src/pages/SettingsPage.tsx`)

- [x] ~~**Public `federation_trust_mark_endpoint`/`_list`/`_status` were never advertised or served**~~  
  **Found by:** comparing our own instance's entity configuration against real eduGAIN federations on `testbed.oidf.lab.surf.nl` — every real trust anchor there advertises these three endpoints; ours advertised none, and hitting `/trust_mark` returned a bare 404 rather than a spec-compliant `invalid_request`. Root cause: `lighthouse/config.yaml` / `lighthouse2/config.yaml` only enabled `fetch`, `list`, `resolve` under `endpoints:` — LightHouse supports `trust_mark`, `trust_mark_status`, `trust_mark_list` the same way but they were never turned on.  
  **Fixed:** added the three endpoint entries to both config files. Verified: issued a mark to a real testbed subject entity and round-tripped it through our own instance's public `/trust_mark` endpoint successfully (matches the shape of real federation responses: `alg: ES512`, `typ: trust-mark+jwt`). Without this, marks we issue are only visible in our own admin UI — never resolvable by an external relying party querying the standard federation protocol.

- [x] ~~**Trust mark JWT viewer decoded the wrong claim for the trust mark type**~~  
  **Found by:** the round-trip above — the real JWT LightHouse returns uses the claim `trust_mark_type`, not `id`. `jwt-utils.ts`'s `TrustMarkPayload` type and `JwtDetailDialog.tsx` assumed `id` (an older/different spec draft's claim name), so the "Trust Mark Type" field in the JWT detail dialog was always blank for every real issued mark — silently, since no test ever opened that dialog and asserted on its content.  
  **Fixed:** `src/lib/jwt-utils.ts`, `src/components/trust-marks/JwtDetailDialog.tsx`, `src/components/trust-marks/SelfTrustMarksTab.tsx` now read `trust_mark_type`. Added `e2e/tests/trust-marks-testbed-validation.spec.ts` (opt-in via `RUN_TESTBED_TESTS=1`, skips gracefully if the testbed is unreachable) which issues a mark to a real testbed entity, fetches it back via the public endpoint, and asserts the correct claim names — guarding this regression going forward.

---

## 🚀 Production deployment gaps

Unlike the sections above, these weren't found by gap-finding e2e tests —
they're known, deliberate simplifications that make sense for local
dev/demo but need addressing before any real deployment. None are
blocking further feature/mesh work; parked here so they don't get
rediscovered as a surprise later.

- [ ] **No real user login — only local JWT accounts**  
  Auth is JWT against accounts seeded directly in the backend's own
  `users` table (`admin@oidfed.org` / `admin123`, `tech@example.org` /
  `user123` — see `README.md`). An `OIDCProvider` model already exists as
  scaffolding (`backend/app/models/oidc_provider.py`) but isn't wired to
  a live login flow. Real external IdP federation (OIDC/SAML) is a real
  gap, not a nice-to-have — authorization (RBAC) itself is fully
  implemented and not affected by this (see `ARCHITECTURE.md`'s
  Authentication & Authorization section).

- [ ] **No TLS anywhere**  
  Every service in `docker-compose.yml` — `ui`, `backend`, every
  LightHouse node — speaks plain HTTP, including between containers.
  Fine for a local/demo docker network, not for a real deployment on a
  real network. No cert termination (reverse proxy, sidecar, or
  otherwise) is configured anywhere in this repo.

- [ ] **Admin credentials are plain env vars with weak hardcoded defaults**  
  `LIGHTHOUSE_ADMIN_USERNAME`/`PASSWORD` and `LIGHTHOUSE2_ADMIN_USERNAME`/
  `PASSWORD` default to `gateway`/`gateway` and `gateway2`/`gateway2`
  (`docker-compose.yml`) with no secrets-manager integration — anyone who
  can read the compose file or process environment has them. Needs a real
  secrets story (Vault, cloud secrets manager, or at minimum enforced
  non-default values with no fallback) before real deployment.

- [ ] **Every LightHouse node has its own admin API auth turned off**  
  `api.admin.users_enabled: false` in every `config.yaml` in this repo
  (`lighthouse`, `lighthouse2`, `mesh-*`, `mesh2-*`) — LightHouse itself
  doesn't check the admin credentials above at all today; the only thing
  protecting those admin APIs is that they're not publicly reachable,
  which is a docker-network accident (see `docs/FEDERATION-TOPOLOGY.md`'s
  network-separation notes), not a real security boundary. Turning this
  on for a real deployment needs its own design pass — `backend/app/routers/proxy.py`
  already attaches Basic Auth on every request, so LightHouse-side
  enforcement should be additive, but this hasn't been tested with
  `users_enabled: true` at all.

---

## ✅ Confirmed working (from e2e tests)

- RBAC: non-admin users are correctly blocked from `/approvals`, `/users`, `/trust-anchors`, `/rbac`
- RBAC: non-admin users do NOT see the "Register Entity" button
- LightHouse federation endpoints `/fetch`, `/list`, `/resolve` are live and advertised in entity config JWT
- Entity registration (pending status) flow works end-to-end
- Approval flow (approve/reject) works end-to-end
- Settings: entity config tab, keys tab, constraints tab, metadata policies tab all load correctly
- Trust mark type creation works; Issuance tab (specs + subjects) fully functional
- Entity detail: overview, metadata (editable), JWKS (add/delete), constraints, policies tabs all load
- Delete entity from detail page works (with AlertDialog confirmation)
- Back navigation from entity detail works
- Authority hint error details are surfaced in the UI toast
- Entity status URL deep-link (`?status=`) works for bookmarkable/shareable filters
- 106/109 e2e tests pass (3 skipped: 2 trust-marks UI spec gaps, 1 entity-detail no-direct-issue shortcut)
