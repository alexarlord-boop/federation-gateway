# Trust Mark Correctness Pass Design

## Problem

Recent feedback shows that deployment is no longer the primary gap in this repository. The stack already supports configurable UI/backend/public LightHouse ports, separates public and admin base URLs per instance, supports admin basic auth through environment variables, and requires manual instance selection in the UI.

The remaining issues are concentrated in trust-mark UX and semantics:

- issuance specs expose subject-level additional claims, but not shared spec-level additional claims
- issuance subjects use UI wording and mutation values that do not match the backend's inactive state
- subject additional claims can appear empty or fail with unhelpful errors
- trust-mark timing labels currently mix configured lifetime and concrete JWT expiry in the same presentation
- refresh-grace-period help text does not explain the actual synchronous vs asynchronous refresh behavior

This pass should correct those mismatches without reopening deployment or broad navigation work.

## Current State Assessment

### Already implemented

- Docker Compose exposes configurable `UI_PORT`, `BACKEND_PORT`, and `LIGHTHOUSE_PUBLIC_PORT`
- backend instance config is loaded from `backend/config/gateway.yaml`
- instances distinguish `public_base_url` from `admin_base_url`
- admin credentials are sourced from environment variables
- the UI does not auto-select the first instance; selection is explicit and persisted
- terminology cleanup is mostly complete, with the UI already using `Subordinates` and `Authority Hints` in the main operator flows

### Remaining gaps

- Trust mark issuance lacks spec-level `additional_claims` editing even though the API models support it
- Subject status controls still use `suspended` language/value where the operator and backend should use `inactive`
- Subject claims UX does not reliably reflect existing claims and falls back to generic error toasts
- Self trust mark timing presentation overloads one column with two different meanings
- Refresh configuration help text is semantically inaccurate

## Goals

1. Align trust-mark UI semantics with the current backend and API contract.
2. Make trust-mark issuance workflows behave predictably for operators.
3. Surface actionable error feedback for trust-mark mutations.
4. Keep the implementation narrow and frontend-focused.

## Non-Goals

- Changing deployment or instance-discovery behavior
- Reworking sidebar/navigation structure
- Broad terminology cleanup outside trust-mark-adjacent surfaces
- Backend or OpenAPI changes unless implementation proves the frontend cannot satisfy the approved behavior with the existing contract

## Proposed Design

### 1. Scope

The implementation covers:

- `Self Trust Marks` display and refresh help text
- `Trust Mark Issuance` spec create/edit flows
- issuance subject status and additional-claims handling
- directly-related frontend hooks and formatting helpers

The implementation does not cover:

- deployment configuration
- trust-anchor switching behavior
- large-scale layout changes

### 2. Issuance spec behavior

Issuance specs should expose shared `additional_claims` at the spec level during create and edit flows. This allows an operator to define claims that apply to all issued trust marks under the spec, with subject-level claims remaining available for per-subject overrides or additions.

The spec form should continue using the current page structure and existing trust-mark issuance screen. The change is additive: a dedicated spec-level additional-claims editor is introduced alongside the existing spec fields rather than moving the workflow into a new screen.

If a spec has an optional description, that description should also be shown consistently in the issuance UI where it helps operators understand what they are issuing.

### 3. Subject behavior

Issuance subjects should only use backend-valid status values in the UI. The inactive state should be represented as `inactive`, and the control text should say `Active` / `Inactive`. The UI must stop sending or implying `suspended` as the inactive state for trust-mark subjects.

Expanded subject rows should display existing additional claims reliably. If the subject list payload already contains `additional_claims`, the UI should treat that as an available source of truth for the initial expanded view instead of showing an empty panel while a follow-up fetch disagrees or fails.

Adding or removing subject claims should remain mutation-based, but the UI must no longer fail with a generic message when the backend returns usable detail. Validation and mutation errors should surface backend detail where available.

### 4. Timing and refresh semantics

The trust-mark timing presentation should no longer use a single `Expiry` label for values that mean different things:

- self-issued rows currently display configured lifetime
- JWT-backed rows display effective expiry/remaining validity

The UI should replace that overloaded presentation with a neutral `Timing` display:

- `Lifetime: <seconds>s` for self-issued trust marks
- `Expires in: <relative time>` for JWT-backed trust marks

This preserves the compact table layout while making the meaning explicit per row.

Refresh help text should be corrected to describe the intended behavior:

- when the remaining time falls below the minimum acceptable lifetime, refresh becomes synchronous
- when the token remains valid but falls inside the refresh grace period, the current token is returned and refresh is kicked off asynchronously

The wording can stay concise, but it must communicate those two thresholds accurately.

## Components and Files

Primary implementation touchpoints:

- `src/pages/TrustMarksPage.tsx`
- `src/components/trust-marks/SelfTrustMarksTab.tsx`
- `src/hooks/useTrustMarkIssuance.ts`
- `src/hooks/useTrustMarkSubjectClaims.ts`

Secondary/shared touchpoints only if needed:

- trust-mark formatting helpers
- small shared field editors reused by trust-mark forms

Generated client files should remain unchanged unless regeneration is explicitly required by an API-contract mismatch.

## Error Handling

- Prefer backend-provided error detail in toasts for claim and status mutations.
- Distinguish between `no claims configured` and `claims could not be loaded`.
- Do not silently coerce unsupported statuses.
- Preserve current loading and permission-guard patterns already used in the trust-mark pages.

## Verification

Extend the existing trust-mark end-to-end coverage to assert:

1. issuance specs support spec-level additional claims
2. subject additional claims render existing values and can be updated
3. subject status changes use `inactive` rather than `suspended`
4. timing text is explicit for self-issued vs JWT-backed rows
5. backend error details are visible in the UI when mutations fail

Deployment and unrelated navigation tests should remain unchanged unless one of the trust-mark fixes causes a regression there.

## Recommended Implementation Strategy

Implement this as a narrow frontend correctness pass:

1. fix trust-mark screen semantics and payload values
2. add spec-level claims support
3. improve claim/error handling
4. extend trust-mark regression coverage

This is the highest-value remaining slice because it addresses the gaps still visible in the current state without reopening already-solved deployment work.
