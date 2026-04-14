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

## 🤝 Requires LightHouse / OIDFed team collaboration

These require either a LightHouse API change, OIDFed spec clarification, or cross-team design agreement before we can implement the UI.

### 🟠 High — Backend behaviour blocks UI implementation

- [ ] **Entity detail Policies tab broken for entities with no policies**  
  File: `src/components/SubordinateMetadataPoliciesTab.tsx`  
  When a subordinate has no metadata policies configured, the LightHouse API returns a 404/error instead of an empty object `{}`. This causes the UI to enter a permanent error state — the "Edit JSON" button never appears and operators cannot create the first policy for an entity.  
  **Needs:** LightHouse to return `{}` (or `204`) for missing policies rather than an error response.

- [ ] **No "issue trust mark to entity" workflow**  
  File: `src/pages/TrustMarksPage.tsx`  
  Trust mark types can be created and deleted, but there is no UI to issue a trust mark to a specific entity. The backend has an issuance API, but the design of the issuance flow (which entity, which trust mark type, what claims) needs alignment with the OIDFed trust mark issuance spec (§ 5.3).  
  **Needs:** Agreement with LightHouse team on the issuance API contract and claim schema.

### 🔵 Low — Validation / spec ambiguity

- [ ] **Authority hint validation may silently reject valid-looking URLs**  
  File: `src/pages/SettingsPage.tsx` line 195 / LightHouse admin API  
  The `addHint` API call sends `{ entity_id: <url> }`. It is unclear whether LightHouse validates the URL resolves to a real federation entity. If it does, test/staging hints fail silently with no actionable error message in the UI.  
  **Needs:** LightHouse docs / team clarification on validation rules so we can surface the correct error message.

---

## ✅ Confirmed working (from e2e tests)

- RBAC: non-admin users are correctly blocked from `/approvals`, `/users`, `/trust-anchors`, `/rbac`
- RBAC: non-admin users do NOT see the "Register Entity" button
- LightHouse federation endpoints `/fetch`, `/list`, `/resolve` are live and advertised in entity config JWT
- Entity registration (pending status) flow works end-to-end
- Approval flow (approve/reject) works end-to-end
- Settings: entity config tab, keys tab, constraints tab, metadata policies tab all load correctly
- Trust mark type creation works
- Entity detail: overview, metadata (read-only), JWKS (read-only), constraints tabs all load
- Delete entity from detail page works (with AlertDialog confirmation)
- Back navigation from entity detail works
