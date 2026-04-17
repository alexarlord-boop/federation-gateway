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

---

## ~~🤝 Requires LightHouse / OIDFed team collaboration~~ → All resolved

Items originally thought to need external collaboration were self-fixable:

- [x] ~~**Entity detail Policies tab broken for entities with no policies**~~  
  **Fixed:** `useSubordinateMetadataPolicies.ts` query function now catches 404 and returns `{}` — no LightHouse change needed. (`src/hooks/useSubordinateMetadataPolicies.ts`)

- [x] ~~**No "issue trust mark to entity" workflow**~~  
  **Fixed:** `IssuanceSpecsTab` + `SpecSubjectsPanel` were already fully implemented in `TrustMarksPage.tsx`; the **Issuance** tab is now visible when `trust_mark_issuance` is advertised by LightHouse (enabled in v0.20.0 manifest). Note: there is still no single-click "issue to entity" shortcut — you navigate Trust Marks → Issuance → select spec → Add Subject. GAP test updated to reflect this (direct-issue shortcut is a UX gap, not a blocker).

- [x] ~~**Authority hint validation silently drops error detail**~~  
  **Fixed:** `handleAdd` in `AuthorityHintsSection` now surfaces `err?.body?.detail` in the error toast so operators see actionable validation messages. (`src/pages/SettingsPage.tsx`)

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
- 64/65 e2e tests pass (1 skipped = ongoing UX gap: no direct "issue to entity" shortcut)
