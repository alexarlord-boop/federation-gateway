# LightHouse Trust Mark PATCH Alignment Design

## Problem

Trust mark issuance-spec editing in the gateway stalled for two separate reasons that looked like one:

1. The LightHouse Admin API PATCH path for `TrustMarkSpec.additional_claims` returned `500` even when given the correct object-map payload defined by the API spec.
2. This repository's generated TypeScript client for trust mark specs is stale and still models `additional_claims` as an array of `AdditionalClaim` rows instead of the object-map shape used by the upstream contract.

Direct verification against the running stack showed:

- `POST /api/v1/admin/trust-marks/issuance-spec` with object-form `additional_claims` succeeds
- `PATCH /api/v1/admin/trust-marks/issuance-spec/{id}` with scalar fields like `description` succeeds
- `PATCH /api/v1/admin/trust-marks/issuance-spec/{id}` with object-form `additional_claims` originally failed with a backend SQL conversion error
- `oidfed/lighthouse:main` now includes the upstream fix for that PATCH behavior

The checked-in `Federation Admin OpenAPI.yaml` in this repository already matches the upstream GitLab spec for this area, but it is a synchronized local copy rather than the canonical source. The canonical source remains Gabriel's GitLab repository.

## Goals

1. Consume a LightHouse image that includes the fixed PATCH behavior for `TrustMarkSpec.additional_claims`.
2. Align this repository's local client/frontend contract handling with the already-correct spec shape.
3. Preserve the current operator-friendly row editor while sending and reading the correct object-map payload.
4. Restore end-to-end trust mark issuance-spec create/edit/clear workflows and prove them with direct API checks and Playwright coverage.

## Non-Goals

- Broad trust mark UX redesign outside issuance-spec `additional_claims`
- Reworking trust mark subject-level additional-claims behavior
- Establishing a full client-regeneration toolchain in this task if one is not already wired
- Treating the checked-in OpenAPI file as the canonical upstream source

## Current State Assessment

### Verified good

- Upstream GitLab spec and local `Federation Admin OpenAPI.yaml` both define issuance-spec `additional_claims` as an object with `additionalProperties: true`.
- LightHouse create for issuance specs accepts the object-map form.
- LightHouse PATCH for scalar fields works.
- A newly published `oidfed/lighthouse:main` image now passes PATCH for object-form and empty-object `additional_claims`.

### Verified drift or failure

- The generated client models in `src/client/models/TrustMarkSpec.ts`, `AddTrustMarkSpec.ts`, and `PatchTrustMarkSpec.ts` still type `additional_claims` as `AdditionalClaims` (array rows).
- The gateway UI therefore has to adapt between row editing and object-map payloads.
- This repository pins `oidfed/lighthouse:0.20.0` in `docker-compose.yml`, so the local stack does not pick up the newly fixed runtime unless updated.

## Proposed Design

### 1. Runtime alignment

Update local runtime configuration to use a LightHouse image that contains the confirmed PATCH fix. The expected target is the now-working `oidfed/lighthouse:main` image or a pinned digest derived from that image if we want reproducibility after validation.

The design should avoid hand-waving around "latest available behavior". The repository should point at a version or digest that has already been verified against the trust-mark issuance-spec PATCH flow.

### 2. Contract alignment inside this repository

Do not change the shape of `additional_claims` in the local OpenAPI YAML, because it already matches the upstream GitLab source for issuance specs.

Instead, correct the stale generated-client surface in this repository so trust mark spec models reflect the object-map contract. If a safe regeneration path is not already wired, make a targeted local correction to the affected models and any directly dependent types/services in `src/client/`.

This keeps the repository immediately correct while preserving the rule that the true source spec lives upstream.

### 3. Frontend adapter behavior

Keep the row-based `AdditionalClaimsTableEditor` because it is the right operator-facing editing model. `TrustMarksPage.tsx` should continue to act as an adapter:

- object-map API response -> row array for the editor
- row array from the editor -> full object-map payload for create and patch

Because LightHouse applies `additional_claims` as a replace-the-whole-object update, the frontend must always send the complete current object when editing. Omitting keys means dropping them. Clearing all claims should send an explicit empty object.

### 4. Verification strategy

Verification should happen at three levels:

1. **Direct LightHouse API repro**
   - create issuance spec with object-form `additional_claims`
   - patch scalar field
   - patch full `additional_claims` object
   - patch empty object to clear claims

2. **Gateway proxy verification**
   - repeat the same trust mark spec operations through `/api/v1/proxy/{instance_id}/...`
   - confirm the gateway forwards the fixed runtime behavior correctly

3. **UI verification**
   - create a spec with shared claims
   - reopen and confirm claims persist
   - edit the full claims object and confirm replacement semantics
   - clear claims and confirm the object is removed

## Components and Files

Expected touchpoints:

- `docker-compose.yml` — consume the verified LightHouse image
- `src/client/models/TrustMarkSpec.ts`
- `src/client/models/AddTrustMarkSpec.ts`
- `src/client/models/PatchTrustMarkSpec.ts`
- `src/pages/TrustMarksPage.tsx`
- `e2e/tests/trust-marks-crud.spec.ts`
- potentially one or two small trust-mark hooks if type fallout requires it

The checked-in `Federation Admin OpenAPI.yaml` should only be touched if it diverges from the upstream GitLab source during implementation. Based on current verification, no schema change is needed there.

## Risks and Constraints

- Using `oidfed/lighthouse:main` directly improves time-to-fix but is less reproducible than a pinned digest. Implementation should decide whether to pin the tested digest after validation.
- The generated client is marked "do not edit", but the repository currently lacks an obvious root-level regeneration command. A targeted local correction is acceptable for this task if regeneration is not practical.
- Because `additional_claims` replacement semantics are destructive, UI code and tests must avoid partial-object updates that accidentally drop keys.

## Recommended Implementation Strategy

1. update the local LightHouse image reference to the verified fixed runtime
2. correct local trust-mark spec client types to the object-map contract
3. finish the trust-mark spec UI adapter logic around full-object create/edit/clear behavior
4. rerun direct API checks, gateway-path checks, and Playwright trust-mark tests

This sequence unblocks the original Task 1 feature while keeping the scope narrow and aligned with the verified root cause.
