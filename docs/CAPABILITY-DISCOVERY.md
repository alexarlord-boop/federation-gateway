# Capability Discovery & Dynamic Feature Management

> **Status**: implemented, not a proposal. This document originally described
> a design for this feature; it's been rewritten to describe what actually
> shipped, since the two have drifted (most notably: the "Backend Info Panel"
> originally proposed here was built, then later removed for showing
> hardcoded/misleading data — see "What changed since the original design"
> at the bottom).

## Problem Statement

The OpenAPI specification is comprehensive by design — it covers all possible OIDFed management features. However:

1. **Different backend implementations may support different subsets** of the API
2. **Organizations may choose to disable certain features** for policy reasons
3. **RBAC should only manage permissions for features that actually exist** in the deployed backend
4. **The UI should dynamically show/hide features** based on backend capabilities

## Solution: Capability Discovery Endpoint

### Core Concept

The backend self-reports what it supports via a **capability manifest**, seeded directly from the OpenAPI spec's operation list at startup (`backend/app/db/rbac_seed.py`) rather than hand-maintained. The UI:
- Fetches the manifest via React Query (`src/contexts/CapabilityContext.tsx`), not a one-shot startup call — so a manifest change (e.g. an admin toggling a feature off) can be invalidated and re-fetched live
- Dynamically enables/disables features and individual operations
- Drives the RBAC Management page's permission tree
- Falls back to an all-features-enabled manifest if the capabilities endpoint is unreachable, so a backend hiccup degrades gracefully instead of hiding the whole UI

### Endpoint: `GET /api/v1/capabilities`

Real response shape (see `backend/app/routers/capabilities.py`):

```json
{
  "version": "1.0.0",
  "implementation": {
    "name": "FastAPI Reference Implementation",
    "version": "0.2.0",
    "vendor": "NREN Federation Gateway"
  },
  "features": {
    "subordinates": { "enabled": true, "operations": ["list", "create", "read", "update", "delete", "approve"] },
    "trust_anchors": { "enabled": true, "operations": ["list", "create", "read", "update", "delete"] },
    "federation_trust_marks": { "enabled": true, "operations": ["list", "create", "read", "update", "delete"] },
    "trust_mark_issuance": { "enabled": true, "operations": ["list", "create", "read", "update", "delete"] },
    "entity_configuration": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "entity_configuration_trust_marks": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "entity_configuration_metadata": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "authority_hints": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "keys": { "enabled": true, "operations": ["list", "create", "delete", "rotate", "update", "action"] },
    "general_constraints": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "general_metadata_policies": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "subordinate_keys": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "subordinate_metadata": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "subordinate_constraints": { "enabled": true, "operations": ["list", "create", "update", "delete"] },
    "subordinate_metadata_policies": { "enabled": true, "operations": ["list", "create", "update", "delete"] }
  },
  "rbac": {
    "supported": true,
    "roles": [
      { "id": "super_admin", "name": "Super Administrator", "builtin": true },
      { "id": "fed_operator", "name": "Federation Operator", "builtin": true },
      { "id": "viewer", "name": "Viewer", "builtin": true }
    ],
    "permissions_model": "feature-based"
  },
  "extensions": {
    "custom_metadata_fields": true,
    "webhook_notifications": false,
    "audit_logging": true
  }
}
```

The real feature list is considerably more granular than a first pass at
this design would suggest — subordinate-level and entity-configuration-level
concerns (keys, metadata, constraints, metadata policies) are each their own
feature so RBAC can be scoped precisely (e.g. a role that can edit its own
entity's metadata but not a subordinate's).

**Note**: `implementation.name/version/vendor` describes *this gateway*
(the FastAPI BFF), not the connected LightHouse instance — for real,
per-instance facts (LightHouse version, signing algorithm, live protocol
endpoints), see the Dashboard's Instance panel, which reads the connected
instance's own entity configuration directly. Don't confuse the two.

### Schema

```yaml
components:
  schemas:
    CapabilityManifest:
      type: object
      required: [version, implementation, features, rbac]
      properties:
        version: { type: string }
        implementation:
          type: object
          required: [name, version]
          properties:
            name: { type: string }
            version: { type: string }
            vendor: { type: string }
        features:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/FeatureCapability'
        rbac:
          type: object
          required: [supported]
          properties:
            supported: { type: boolean }
            roles:
              type: array
              items: { $ref: '#/components/schemas/RoleDefinition' }
            permissions_model:
              type: string
              enum: [feature-based, endpoint-based, custom]
        extensions:
          type: object
          additionalProperties: { type: boolean }

    FeatureCapability:
      type: object
      required: [enabled]
      properties:
        enabled: { type: boolean }
        operations:
          type: array
          items: { type: string }
        endpoints:
          type: array
          items: { type: string }
        reason:
          type: string
          description: Explanation if the feature is disabled

    RoleDefinition:
      type: object
      required: [id, name]
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string }
        builtin: { type: boolean, default: false }
```

## UI Implementation (as it actually exists)

### 1. `src/services/capabilities.ts`

Defines the `CapabilityManifest` / `FeatureCapability` / `RoleDefinition`
TypeScript types the rest of the UI imports.

### 2. `src/contexts/CapabilityContext.tsx`

React-Query-backed, not the plain `useState`/`useEffect` a first design pass
might reach for — this matters because it means an RBAC feature toggle can
call `queryClient.invalidateQueries({ queryKey: capabilityKeys.all })` and
the whole UI picks up the change live, without a page reload. Ships a
`FALLBACK_MANIFEST` (all features enabled, `rbac.supported: false`) so a
capabilities-endpoint outage doesn't take down the entire app — it just
loses feature gating gracefully.

Exposes `useCapabilities()`, returning `{ capabilities, isLoading,
isFeatureEnabled, hasOperation, getEnabledFeatures }`.

### 3. Dynamic navigation

`src/components/layout/AppSidebar.tsx` gates each nav section on
`isFeatureEnabled('subordinates')`, `isFeatureEnabled('federation_trust_marks')`,
etc. — a feature disabled at the backend simply doesn't render a broken link.

### 4. Conditional actions

Throughout the page components, `useOperationAllowed(feature, operation)`
(built on top of `hasOperation`) gates individual buttons — e.g. Register
Subordinate, Delete, Issue Trust Mark all check the real permission before
rendering, not just the route-level feature flag.

### 5. RBAC Management page

`src/pages/RBACManagementPage.tsx` has two tabs: role/permission assignment
(auto-generates its permission tree from `getEnabledFeatures()` — no
hardcoded permission enum to keep in sync) and a Features tab that lets an
admin toggle individual features on/off for the whole deployment, which is
itself the live source of the manifest the rest of the UI reacts to.

## What changed since the original design

- **Feature set is far more granular** than the original example
  (`subordinates`/`trust_anchors`/`trust_marks`/`jwks_management` →
  15 features covering subordinate- and entity-configuration-level
  concerns separately).
- **RBAC ships with three built-in roles** (`super_admin`, `fed_operator`,
  `viewer`), not four — there's no separate `tech_contact` role.
- **The "Backend Info Panel" originally proposed here was built essentially
  as designed, then removed.** It displayed `implementation.name/version` —
  which is real but describes the *gateway*, never the connected LightHouse
  instance — under a "Backend Information" heading. Operators reasonably
  read that as "info about my federation node," which it never was. It was
  replaced with `InstanceInfoPanel` on the Dashboard, which reads the
  *connected instance's own* entity configuration for real per-instance
  facts (LightHouse version, signing algorithm, live protocol endpoints).
  Lesson: a capability manifest describing the gateway and a status panel
  describing the connected backend are two different concerns and
  shouldn't share one card.
- **Manifest fetching is React-Query-based with a fallback**, not a
  fire-once `useEffect`, specifically so RBAC feature toggles can propagate
  live.

## Benefits (still true)

1. **No OpenAPI spec trimming required** — every endpoint stays documented; backends implement what they can, the UI adapts.
2. **Flexible backend implementations** — a minimal backend can expose just core read operations; this reference implementation exposes nearly everything.
3. **RBAC generates from real capabilities** — no hardcoded permission enum drifting from what the backend actually supports.
4. **No broken links to unimplemented features.**
5. **Backend implementers self-describe in code**, not in a separate doc that goes stale.

## Configuration examples

**Minimal (read-only) backend**:
```json
{ "features": { "subordinates": { "enabled": true, "operations": ["list", "read"] } } }
```
Result: the UI shows subordinates, no create/edit/delete buttons.

**Progressive rollout** (disable a feature with an explanation):
```json
{ "features": { "trust_mark_issuance": { "enabled": false, "reason": "Coming in a future release" } } }
```
Result: the Issuance tab is hidden; the RBAC Features tab shows the reason.

## For backend implementers

Register `/api/v1/capabilities` and return a manifest matching the schema
above. The UI only needs `enabled` per feature to gate navigation and
buttons — `operations` lets you go further and gate individual actions
(create vs. read-only, for example) without a separate permissions system.
