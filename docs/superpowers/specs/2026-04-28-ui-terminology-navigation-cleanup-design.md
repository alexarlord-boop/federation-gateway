# UI Terminology and Navigation Cleanup Design

## Problem

The current UI mixes several overlapping terms in ways that are hard for operators to understand:

- **Leaf Entities** is used where the feedback prefers **Subordinates**
- upstream relationships use both **Superior TA** and **Authority Hint**
- the trust-anchor page mixes authority management with flows that feel subordinate-oriented
- intermediate registration is conceptually separated even though it should behave like a subordinate flow

This creates a product-language mismatch. Users have to translate between internal/UI shorthand and the terminology they expect from the OpenID Federation model.

## Goal

Design a focused UI cleanup pass that:

1. replaces user-facing **Leaf Entities** wording with **Subordinates**
2. standardizes upstream/superior relationship wording around **Authority Hint**
3. keeps local trust-anchor management distinct from subordinate management
4. moves intermediate registration entry points under **Subordinates**
5. improves language and navigation without bundling the deeper entity-type/model redesign

## Scope

This spec covers only the **UI terminology and navigation cleanup** track.

It includes:

- sidebar labels and submenu structure
- page titles, descriptions, buttons, dialogs, and empty states
- moving intermediate registration entry points into the subordinate area
- aligning success/error copy with the new terminology

It does **not** include:

- flexible multi-type entity modeling
- changing the underlying subordinate/trust-anchor data model
- trust marks UX fixes
- issuance/additional-claims redesign
- subject lifecycle/status redesign

## Recommended approach

Use a **presentation-layer terminology pass plus a small navigation adjustment**.

The system should keep its current route and API foundations where possible, but user-facing labels and entry points should be reorganized to reflect a clearer mental model:

- **Authorities page** = local authorities and superior/upstream relationships
- **Subordinates area** = downstream entities, including intermediates

This is preferred over a broader information-architecture rewrite because it addresses the feedback directly, is safer to implement after the deployment work, and leaves the more complex subordinate/entity-type redesign for a dedicated follow-up spec.

## Terminology rules

### Primary user-facing terms

The UI should adopt these rules consistently:

1. **Subordinates** is the umbrella term for downstream entities currently shown as leaf entities.
2. **Authority Hint** is the preferred term for superior/upstream authority references.
3. **Trust Anchor** remains the correct term for local trust-anchor objects and local authority management.
4. **Intermediate** remains a valid subtype or registration mode, but it is surfaced as one kind of subordinate flow rather than as a parallel top-level concept.

### Practical wording rules

- Replace **Leaf Entities** with **Subordinates** in navigation, page titles, descriptions, and empty states.
- Replace **Add Superior TA** and similar variants with **Add Authority Hint**.
- Use **Authority Hint** for upstream/superior relationship UI copy, not for every trust-anchor concept.
- Keep **Trust Anchor** terminology where the UI is talking about actual local authorities, trust-anchor configuration, or trust-anchor lifecycle.

## Navigation design

### Sidebar

The sidebar should present a cleaner split:

- **TAs and IAs** remains the local authorities area for this pass
- **Leaf Entities** becomes **Subordinates**
- subordinate submenu labels become subordinate-oriented as well, for example:
  - **All Entities** -> **All Subordinates**
  - **Register New** can stay action-oriented, but its surrounding page copy should clearly describe subordinate registration

This pass does not require renaming routes immediately, but the visible navigation should stop exposing the old leaf-entity language.

### Intermediate entry points

Intermediate registration should move under the **Subordinates** area.

The intent is not to redesign how intermediate registration works internally. Instead, the user should experience it as:

- enter the subordinate registration flow
- choose or arrive in an intermediate-oriented mode
- complete registration there

That means the authorities page should stop acting like the place where operators discover “Intermediate” as a separate conceptual branch.

## Page-level structure

### TAs and IAs page

This page should focus on:

- local authorities
- superior/upstream relationships
- authority-hint management

The superior section should visibly include **Authority Hints** in its naming and actions. Button labels, dialog titles, descriptions, success toasts, and failure messages should all use the same term.

Examples of the intended cleanup:

- **Add Superior TA** -> **Add Authority Hint**
- dialog titles/descriptions should describe linking an upstream authority through an authority hint
- empty states and helper text should mention authority hints explicitly

### Subordinates pages

The current entities pages should become subordinate pages in user-facing copy:

- **Leaf Entities** -> **Subordinates**
- **Manage registered RPs and OPs in the federation** should shift toward subordinate-oriented language
- no-instance states should say the instance is required to view or register **subordinates**

Intermediate-specific flows should be discoverable from this area instead of the authorities page.

## Data flow and architecture impact

This pass should remain primarily presentational.

### Reuse existing flows

- existing subordinate APIs remain the source of truth for subordinate management
- existing trust-anchor APIs remain the source of truth for local authorities and authority-hint-adjacent surfaces
- current route structures can be preserved unless a small alias or redirect is needed for clearer navigation

### Keep boundaries clear

The cleanup should not blur data ownership:

- **trust-anchor surfaces** still manage trust anchors
- **subordinate surfaces** still manage subordinates
- the change is how users discover and understand those flows, not a hidden data-model merge

## Error handling and UX consistency

All user-facing copy should follow the new terminology rules:

- upstream add/remove errors should mention **Authority Hint**
- subordinate empty states, filters, and confirmations should mention **Subordinates**
- intermediate-related UI should appear as subordinate-specific wording instead of standing apart as a separate area

The system should avoid mixed language in a single flow. For example, a button should not say **Add Superior TA** while the dialog action says **Add Authority Hint**.

## Testing strategy

### UI coverage

Add or update tests for:

- sidebar label changes
- subordinate page headings and empty states
- authority-hint button and dialog wording
- intermediate entry-point placement under the subordinate area

### Regression focus

This track should verify:

- no broken navigation after label changes
- no accidental removal of existing registration/configuration flows
- copy stays consistent across related screens, not just one headline per page

## Non-goals

This spec does not define:

- expanded subordinate entity-type support
- support for multiple arbitrary entity types per subordinate
- trust-mark wording and content fixes
- issuance and claims redesign
- inactive/suspended lifecycle redesign

Those should remain separate tracks so this UI cleanup stays focused and low-risk.

## Follow-on dependency

This terminology/navigation cleanup is intentionally staged before the deeper **Subordinates and entity-type modeling** work.

That order is useful because:

1. it gives operators cleaner language immediately
2. it establishes **Subordinates** as the product-level umbrella term
3. it creates a better UI home for future intermediate/entity-type work without forcing that larger redesign into this pass
