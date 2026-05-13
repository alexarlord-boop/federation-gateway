# ShareMD Follow-up UI Alignment Design

## Problem

Most of Gabriel's ShareMD note is now reflected in the product, but two UI gaps remain:

1. The Trust Anchors page still shows a **Registered Intermediates** section even though the intended model is that intermediates are managed from **Subordinates**.
2. Trust-mark subjects expose an optional `description` field in the API model, but the Trust Marks UI does not show it.

This follow-up should close those remaining gaps without reopening the already-stabilized trust-anchor, subordinate, or trust-mark flows.

## Goal

Align the remaining UI behavior with the ShareMD note by:

- removing the Registered Intermediates section from the Trust Anchors page
- pointing operators to Subordinates for intermediate management
- showing trust-mark subject descriptions inline in the subjects table when available

## Non-goals

- redesigning the Subordinates flow
- changing trust-mark API contracts or backend behavior
- broader terminology cleanup outside the affected screens
- restructuring the Trust Marks subjects UI beyond inline description display

## Current State

### Trust Anchors page

`TrustAnchorsPage.tsx` currently:

- loads deployment-managed trust anchors for **My Instances**
- loads authority hints
- also loads `federation_entity` subordinates and filters them into `intermediateTAs`
- renders a full **Registered Intermediates** section with status and delete controls

That behavior is out of line with the desired product model. The page already contains guidance text that intermediates belong under **Subordinates**, so the remaining section is a mixed model.

### Trust Marks subjects

The generated `TrustMarkSubject` model includes:

- `entity_id`
- `status`
- optional `description`
- optional `additional_claims`

But `SpecSubjectsPanel` currently renders only:

- entity ID
- status
- claims expansion control
- status toggle and delete action

The description is available but unused.

## Proposed Design

### 1. Trust Anchors page becomes strictly two-surface

The Trust Anchors page will show only:

1. **My Instances** — deployment-managed, read-only
2. **Authority Hints** — manageable upstream links

The **Registered Intermediates** section will be removed completely:

- no intermediate list
- no intermediate empty state
- no intermediate status controls
- no intermediate delete controls from this page

The page description will be updated so it no longer promises that registered intermediates are shown there.

The page will retain plain explanatory copy that intermediates are managed from **Subordinates**, but it will not add a new CTA or button. This keeps the change aligned to the ShareMD note without adding new navigation behavior.

### 2. Trust-mark subject descriptions render inline

In the Trust Marks issuance subjects table:

- the primary line remains the subject `entity_id`
- if `description` is present and non-empty, render it directly below the entity ID in muted secondary text
- if there is no description, the row stays visually unchanged

This keeps the current compact table layout while exposing the field Gabriel asked for.

No claims or status behavior changes are needed.

## Implementation Boundaries

### `src/pages/TrustAnchorsPage.tsx`

- remove the subordinate query used only for intermediates
- remove `intermediateTAs`
- remove subordinate mutation wiring used only by the Registered Intermediates section
- keep authority hint add/remove behavior intact
- update page description and guidance copy

### `src/pages/TrustMarksPage.tsx`

- update `SpecSubjectsPanel`
- render subject descriptions inline under entity IDs when available
- keep subject expansion, claims editing, deletion, and status toggles unchanged

### Tests

#### Trust Anchors

Update the focused Trust Anchors Playwright coverage so it asserts:

- no Registered Intermediates section is shown
- no intermediate management UI remains on the Trust Anchors page
- plain guidance points users to Subordinates

#### Trust Marks

Add or update focused trust-mark UI coverage to assert subject descriptions are shown inline when present, using the smallest reliable regression test available in the existing test setup.

## Error Handling and Safety

- subjects without descriptions must render exactly as before
- the Trust Anchors page must stop mutating intermediate subordinates
- authority hint actions must remain working
- trust-mark subject claims and status behavior must remain unchanged

## Verification

The implementation should be verified with focused checks covering:

- Trust Anchors page regression behavior
- Trust Marks subject rendering behavior
- backend tests needed for confidence in unchanged APIs
- frontend typecheck and build

The final verification set should stay scoped to the touched surfaces unless implementation uncovers a broader coupling.

## Completion Criteria

This follow-up is complete when:

- the Trust Anchors page no longer contains a Registered Intermediates section
- the page copy points operators to Subordinates for intermediate management
- trust-mark subject descriptions render inline when present
- focused regression coverage and build/type checks pass
- the resulting behavior matches the remaining ShareMD note items without broader refactoring
