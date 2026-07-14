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
  **Fixed:** added `stats/top/user-agents`, `stats/top/clients`, `stats/top/params`, `stats/top/countries`, `stats/latency` (full p50–p99/min/max), and a `stats/timeseries`-backed "Requests Over Time" line chart (Total Requests + Errors, `useStatsTimeseries` with `keepPreviousData` so range switches don't flash) to `useStats.ts` and `StatsPage.tsx`, plus a CSV/JSON export button backed by `stats/export`. `stats/top/countries` gracefully shows an empty state (no GeoIP configured) rather than being hidden. `stats/daily` is still not wired up — still non-functional upstream, see below. Chart colors validated with the dataviz skill's palette validator in both light and dark mode; `--destructive`'s dark value failed contrast as a thin line, so added a dedicated `--chart-line-2` token instead of reusing it.

- [x] ~~**`docker-compose.yml` was pinned to the stale `oidfed/lighthouse:latest` tag**~~  
  **Found by:** being told the two bugs below were "already fixed" — they weren't, on the image we had. Docker Hub showed `latest` was last pushed 2026-06-15 while `main` and several `sha-*` builds went out as recently as 2026-07-09 — `latest` isn't kept in sync with actual HEAD. **Fixed:** re-pinned both `lighthouse` and `lighthouse2` services to `oidfed/lighthouse@sha256:689b121...` (the real newest build, currently tagged `main`). Note: `lighthouse_version` in the entity config still reports `0.21.0` on this build even though it contains new fixes — the version claim can't be used to tell builds apart, only the image digest can. Caveat: `main` is a floating branch tag, not a stable release — worth watching for a proper versioned tag upstream.

- [x] ~~**Chain Inspector could only inspect entities registered as our own subordinates**~~  
  **Fixed:** added an "Any Entity" mode (`src/pages/ChainInspectorPage.tsx`) that fetches any real entity's own `.well-known/openid-federation` directly via `GET /api/v1/admin/resolve` (backend/app/routers/resolve.py, pre-existing, previously only used by the registration wizard) — SSRF-guarded (https-only, private/loopback IPs blocked), works around real federation hosts not setting browser CORS headers. Shows authority hints as clickable chips to walk the real chain, and lists any trust marks embedded in the entity's config. Verified live against `testbed.oidf.lab.surf.nl` (SWAMID, SURFconext, HAKA, eduGAIN root). The original "Via Trust Anchor" fetch/resolve mode (scoped to our own subordinates) is preserved as a second tab.

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

---

## 🤝 Requires LightHouse / OIDFed team collaboration

- [ ] **`stats/daily` is non-functional against SQLite storage**  
  Returns an empty array despite real data existing in range, even with a narrow, sane date window. Same class of bug as `stats/timeseries` used to have (date-bucketing query) — `timeseries` itself is now fixed upstream (see above), but `daily` still fails, silently (swallowed error) rather than propagating one. Confirmed still broken on the newest available build (`sha256:689b121...`, 2026-07-09). Not wired into the Stats page; noted inline instead of a silent gap.

- [ ] **Unmatched-route requests are logged with the wrong status code**  
  **Found by:** wiring the "Requests Over Time" chart and noticing the Errors line stayed flat at 0 despite deliberately hitting several nonexistent paths. A live `curl` to a bogus path returns a real `404`, but the stored stats-log row for that same request has `status_code: 200`. Scoped precisely: this only affects **unmatched routes** hitting Fiber's default "Cannot GET" fallback — registered endpoints returning real 4xx via application logic (e.g. `/resolve`, `/fetch` with bad params → 400) log correctly. Confirmed on the newest build (`sha256:689b121...`). Effect: `stats/summary`'s `error_rate`/`total_errors`, the `Requests by Status` breakdown, and the new timeseries chart's Errors line will all *undercount* errors from bogus/scanner traffic specifically — genuine application errors are unaffected. Not fixable on our side.

- [ ] **`trust_mark_status` has no standardized wire contract across real implementations**  
  Not a bug exactly, but a genuine interop gap the OIDFed community should tighten: confirmed by hand that the real eduGAIN testbed root (`edugain.oidf.lab.surf.nl`) accepts `GET ?sub=&trust_mark_id=` and returns plain JSON `{"active": bool}`, while our own LightHouse (0.21.0) rejects that GET with `405 Method Not Allowed` and only accepts `POST {"trust_mark": "<jwt>"}`, returning a *signed* status-response JWT (`typ: trust-mark-status-response+jwt`) whose payload carries `status: "active" | "revoked"`. Neither is wrong per spec text, but a client can't know which contract an issuer uses without probing. **Worked around on our side:** `GET /api/v1/admin/trust-mark-status` (`backend/app/routers/resolve.py`) tries GET first and falls back to POST + JWT-body decode if that fails — but this is a client-side workaround, not a fix; a genuinely interoperable federation needs one documented contract.

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
