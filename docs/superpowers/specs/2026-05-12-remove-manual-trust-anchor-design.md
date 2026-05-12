# Remove Manual Trust-Anchor Feature Design

## Problem

The product model has shifted to deployment-managed federation instances loaded from `backend/config/gateway.yaml`, but the codebase still exposes a parallel manual trust-anchor feature:

- the **Add TA Instance** button and dialog
- manual configure/delete actions for non-deployment-managed trust anchors
- frontend mutations and tests that exercise manual trust-anchor CRUD
- backend CRUD endpoints that primarily exist to support that UI path

This creates a confusing story for operators and for demos because the Trust Anchors page mixes config-managed instances with a second runtime-created trust-anchor model.

## Goal

Retire the manual trust-anchor feature end-to-end so the product presents one clear model:

1. deployment-managed instances come from `backend/config/gateway.yaml`
2. the backend mirrors those instances into the BFF database for display and count derivation
3. the UI treats **My Instances** as read-only deployment inventory, not a runtime trust-anchor editor

## Scope

This cleanup includes:

- removing the **Add TA Instance** button and dialog from `TrustAnchorsPage`
- removing manual trust-anchor configure/delete affordances from the Trust Anchors UI
- removing frontend hook mutations that only support manual trust-anchor CRUD if nothing else still uses them
- removing obsolete E2E/backend tests that create and mutate manual trust anchors
- removing backend trust-anchor write endpoints if they are no longer part of the supported product model
- updating UI and documentation wording so trust anchors are clearly config-managed/deployment-managed

This cleanup does not include:

- changing the proxy routing model
- changing subordinate registration or approval flows
- redesigning authority hints
- redesigning deployment config format

## Desired Product Model

### Source of truth

`backend/config/gateway.yaml` is the authoritative instance registry. `docker-compose.yml` supplies the runtime topology that must match that config, but does not define product-visible instances on its own.

### Trust Anchors page

After cleanup, the page should represent three distinct concepts clearly:

1. **My Instances** — deployment-managed instances only, read-only from the UI
2. **Authority Hints** — upstream trust relationships that remain manageable in the UI
3. **Registered Intermediates** — subordinate-managed entities that remain driven by the subordinate workflow

There is no UI path to create, edit, or delete trust anchors directly.

### Proxy/admin API behavior

The browser-to-backend-to-admin proxy model stays unchanged:

- browser talks to the UI/BFF
- BFF selects an instance from deployment-managed config
- BFF proxies admin requests server-side using configured admin credentials/endpoints

Removing manual trust-anchor CRUD should not affect proxy behavior.

## Design

### Frontend

`TrustAnchorsPage.tsx` should be simplified to a deployment-managed read model:

- delete `AddTrustAnchorDialog`
- remove the `createTrustAnchor` / `deleteTrustAnchor` wiring from the page
- remove trust-anchor configure/delete menu actions from **My Instances**
- keep deployment-managed card rendering, subordinate counts, and active-instance display
- keep authority-hint management
- keep registered-intermediate management

`useGatewayTrustAnchors.ts` should be reduced to the operations still needed after cleanup:

- retain list/read behavior
- retain config read behavior only if a remaining page still consumes it
- remove create/delete/config write mutations if no longer used

### Backend

`backend/app/routers/trust_anchors.py` should become a read-focused surface for deployment-managed trust anchors:

- keep list behavior
- keep subordinate-count derivation
- keep any read-only config endpoint still needed by the UI
- remove trust-anchor create/delete/update write endpoints if no supported UI or product flow depends on them

The deployment-managed mirror seeded from `gateway.yaml` remains the mechanism that populates trust-anchor rows used by the UI.

### Tests

Tests should shift from validating manual trust-anchor CRUD to validating the config-managed model:

- remove E2E tests that create a manual trust anchor and open configure flows
- replace them with assertions that **My Instances** is read-only and deployment-managed
- preserve tests for deployment-managed card behavior, subordinate counts, authority hints, and registered intermediates
- remove backend tests whose only purpose is manual trust-anchor create/delete semantics

### Documentation

Update docs and page copy so they describe trust anchors as deployment-managed/config-backed rather than operator-created through the UI.

## Error Handling

Removing write paths should eliminate obsolete trust-anchor mutation failure states from the UI rather than hide them behind disabled controls. Any remaining trust-anchor reads should continue to fail explicitly if configuration or seeded state is inconsistent.

## Testing Strategy

Verification should prove the new single-model behavior:

- frontend build and typecheck still pass
- BFF trust-anchor tests pass after removing manual CRUD expectations
- Playwright trust-anchor coverage confirms:
  - no **Add TA Instance** button
  - no configure/delete actions for deployment-managed instances
  - authority hints and subordinate/intermediate flows still behave correctly
  - My Instances still shows live subordinate counts

## Risks and Mitigations

### Risk: removing backend write endpoints breaks hidden callers

Mitigation: search the codebase and tests for all call sites before removing the endpoints; remove UI usage and tests in the same pass.

### Risk: config-read endpoint may still be required indirectly

Mitigation: keep read-only config behavior only if a remaining UI surface still consumes it; otherwise remove it in the same cleanup.

### Risk: wording and architecture drift

Mitigation: update the Trust Anchors page copy and README/deployment guidance together so the demo story and code match.

## Success Criteria

The cleanup is complete when:

- the Trust Anchors page no longer exposes **Add TA Instance**
- users cannot create/configure/delete trust anchors through the UI
- obsolete frontend/backend manual trust-anchor CRUD paths are removed
- trust-anchor behavior is clearly aligned with deployment-managed config
- proxy/admin API behavior still works for the configured instance model
- trust-anchor, subordinate-count, and deployment-managed tests pass with the new model
