# Parallel Fix Pass Design

## Problem

Gabriel's remaining concerns are now concentrated in three mostly decoupled areas:

1. Trust-mark correctness, including runtime compatibility, issuance-spec claim handling, subject status semantics, and timing/refresh copy.
2. Trust-anchor instance counts, where the backend currently reports `subordinate_count=0` instead of real values.
3. Subordinate registration entity-type UX, where the UI remains too restrictive compared with the broader set of entity types already recognized by the application.

The goal is to fix these in parallel without introducing unnecessary cross-track edits or a large integration tail.

## Scope

This pass includes:

- Pinning the verified LightHouse runtime image needed for trust-mark spec claim behavior.
- Completing trust-mark UI/runtime correctness for spec-level `additional_claims`, valid subject status payloads, and timing/refresh language.
- Fixing the trust-anchor backend response so subordinate counts are no longer hardcoded to zero.
- Relaxing the subordinate registration entity-type UI so users can select the broader supported type set, including multi-type selection where the backend already accepts arrays.
- Running one final integrator pass for shared verification and merge resolution.

This pass does not include:

- New route structure or navigation changes unrelated to the remaining concerns.
- Backend schema redesign beyond the specific trust-anchor count fix.
- Broad refactors outside the touched trust-mark, trust-anchor, and subordinate-registration surfaces.

## Architecture

The work is split into three parallel tracks plus one integrator pass.

### Track 1: Trust-mark/runtime

This track owns:

- `docker-compose.yml`
- `README.md`
- Trust-mark spec UI behavior
- Trust-mark subject status payloads
- Trust-mark timing and refresh explanatory copy
- Trust-mark-focused Playwright coverage

Expected outcome:

- The local runtime uses the verified LightHouse image compatible with trust-mark spec `additional_claims` patch semantics.
- Issuance-spec `additional_claims` behave as full-replacement object data end-to-end.
- Subject status changes send backend-valid status values.
- Trust-mark timing labels and refresh guidance match actual behavior.

### Track 2: Trust-anchor/backend

This track owns:

- Backend logic behind `/api/v1/admin/trust-anchors`
- Any minimal frontend adaptation required to render the corrected subordinate count

Expected outcome:

- Trust-anchor responses stop hardcoding `subordinate_count=0`.
- The UI renders the backend-provided count directly rather than inferring or masking it on the client side.

### Track 3: Entity UX

This track owns:

- Subordinate registration entity-type selection UI
- Registration-focused Playwright coverage for the expanded entity-type behavior

Expected outcome:

- Users can choose the broader entity-type set already recognized in code.
- Multi-type selection is supported where the backend already accepts arrays.
- Intermediate registration remains a constrained special case that continues to force the appropriate intermediate-compatible type.

### Final integrator pass

This pass owns:

- Rebasing and conflict resolution across the three tracks
- Shared verification across the touched surfaces
- Final cleanup for small integration mismatches revealed after combining the tracks

## Integration contract

The tracks are intentionally isolated by owned surface.

- The trust-mark/runtime track should not edit trust-anchor backend files or subordinate registration files unless a verified shared helper change is strictly necessary.
- The trust-anchor/backend track should not expand into trust-mark behavior or unrelated trust-anchor UX cleanup.
- The entity UX track should stay focused on the registration flow and entity-type selection behavior.

Cross-track dependency rules:

1. Existing shared types and helpers may be reused.
2. New abstractions are allowed only if they remove duplication within the owned track and do not force broad rewrites in the others.
3. If two tracks need the same file, the preferred model is one primary owner plus a later integrator adjustment rather than parallel churn in the same area.

## Data flow and behavior

### Trust marks

- Issuance-spec shared claims must round-trip using the object-based API contract required by the runtime.
- UI forms may remain row-oriented for editing, but they must serialize to and deserialize from the object contract correctly.
- Subject activation/deactivation must use valid backend status values.
- Timing-related presentation must distinguish lifetime-style values from expiry-style JWT values and describe refresh behavior accurately.

### Trust anchors

- The backend remains the source of truth for subordinate counts.
- The UI should display returned values directly and avoid introducing client-side fallback logic that would hide incorrect backend data.

### Subordinate registration

- The UI should expose the broader supported entity-type set already recognized in the application.
- Non-intermediate flows should support multiple selected entity types when building registration payloads.
- Intermediate flows remain constrained so they continue to produce the intended intermediate registration payload.

## Error handling

- Do not add silent fallbacks that hide backend/runtime failures.
- Where the current trust-mark UI collapses failures into generic messages, surface meaningful backend error details when available.
- Backend fixes should continue to fail explicitly if required data cannot be derived instead of silently inventing placeholder values.

## Testing and verification

Each track should keep its own verification close to the owned surface:

- Trust-mark/runtime: targeted runtime verification, trust-mark Playwright slices, and frontend build/type safety checks needed by the touched code.
- Trust-anchor/backend: backend tests for trust-anchor responses and any focused frontend checks that validate rendered counts.
- Entity UX: subordinate registration Playwright coverage and any frontend checks needed by the changed UI.

The final integrator pass should run the shared verification set that covers:

1. Repository build health.
2. Trust-mark regressions.
3. Trust-anchor regressions.
4. Subordinate registration regressions.

## Subagent execution plan

Implementation should use three subagents in parallel:

1. **Trust-mark/runtime subagent** for runtime pinning, trust-mark UI correctness, and trust-mark tests.
2. **Trust-anchor/backend subagent** for subordinate-count correctness and related validation.
3. **Entity UX subagent** for entity-type registration changes and related tests.

After they finish, one main-session integrator pass should combine changes, resolve conflicts, rerun shared verification, and make only the smallest required integration edits.

## Success criteria

The work is complete when all of the following are true:

- The local LightHouse runtime is pinned to the verified image needed for trust-mark spec claim patching.
- Trust-mark issuance-spec shared claims can be created, edited, displayed, and cleared correctly.
- Trust-mark subjects use backend-valid status values.
- Trust-mark timing/refresh language matches actual semantics.
- Trust-anchor subordinate counts are sourced from real backend data rather than hardcoded zeros.
- Subordinate registration supports the broader intended entity-type selection behavior.
- The combined branch passes the shared verification run after integration.
