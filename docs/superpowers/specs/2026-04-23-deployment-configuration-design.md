# Deployment and Configuration Design

## Problem

The current stack assumes a mostly fixed local topology:

- UI on `8080`
- backend on `8765`
- LightHouse on `8081`
- the first LightHouse instance effectively becomes the active one

That shape breaks down for real deployments. Operators need to choose ports for the UI, backend, and LightHouse independently, keep the LightHouse admin API on a separate port from the public surface, and optionally protect the admin API with username/password authentication. The product also needs to support multiple LightHouse instances without silently auto-linking the first one.

## Goal

Design a config-first deployment model where:

1. One deployment can define multiple LightHouse instances
2. Each instance can expose separate public and admin endpoints
3. Admin credentials stay backend-only
4. The frontend does not auto-link the first configured instance
5. The backend and frontend both derive their wiring from deployment configuration instead of implicit defaults

## Scope

This spec covers only the **deployment/configuration** track from the recent feedback. It does **not** redesign UI terminology, trust marks, issuance flows, or subordinate entity modeling. Those should become separate follow-up specs.

## Recommended approach

Use a **config-driven instance registry**. Deployment configuration is the source of truth for instance definitions. The backend loads and validates that configuration, resolves any admin credentials server-side, and exposes a sanitized instance registry to the frontend. The frontend lets operators explicitly select which configured instance they want to work with, but it does not become the primary authority for endpoint wiring.

This is preferred over a DB-seeded or UI-managed registry because it keeps production topology deterministic, makes secret handling safer, and matches the requirement that the admin API can stay private while the public surface remains accessible.

## Architecture

### Core model

The deployment configuration defines an `instances[]` collection. Each entry represents one LightHouse instance and includes:

- stable instance ID
- display name
- public LightHouse base URL
- admin API base URL
- optional admin authentication settings
- optional user-facing port metadata for display and diagnostics

The backend owns parsing, validation, and secret resolution for this collection. The frontend only receives a sanitized representation that excludes secrets.

### Runtime flow

1. Deployment starts with a configuration file and/or environment-derived settings.
2. Backend loads all configured instances on startup.
3. Backend validates required fields and resolves admin credentials server-side.
4. Frontend requests a sanitized instance registry from the backend.
5. On a fresh deployment, the frontend shows an explicit instance-selection state instead of auto-linking the first configured instance.
6. After the operator confirms a target instance, frontend requests include the selected instance ID and backend routes admin operations to that instance's admin endpoint.

### Public vs admin paths

Public and admin traffic must stay conceptually separate:

- **Public path:** UI -> backend -> public LightHouse endpoint when the feature only needs public/runtime behavior
- **Admin path:** UI action -> backend -> admin LightHouse endpoint for management operations

If admin authentication is configured, the backend attaches those credentials when calling the admin endpoint. The browser never receives or stores them.

## Configuration design

### Source of truth

Deployment configuration is authoritative for instance wiring. In the first implementation pass, the UI may display configured values and allow choosing an active instance, but structural endpoint edits remain deployment-owned.

### Instance shape

The recommended configuration shape is:

- `id`
- `name`
- `public_base_url`
- `admin_base_url`
- `admin_auth` (optional)
- `public_port` (optional display/diagnostic field)
- `admin_port` (optional display/diagnostic field)
- `ui_base_url` (optional, for self-diagnostics and operator display)
- `backend_base_url` (optional, for self-diagnostics and operator display)

`admin_auth` should support the LightHouse-compatible username/password flow described in the feedback. Credentials must come from deployment configuration or secret-backed environment variables, not from the browser.

### Multiple instances

Multiple configured instances are a first-class scenario, not an afterthought. The model should support:

- several named instances in one deployment
- independent public and admin endpoints per instance
- optional credentials per instance
- explicit operator selection of the instance to manage

No configured instance is implicitly selected on first load.

## Frontend behavior

### Fresh deployment

On first load, the frontend shows available configured instances but does not immediately bind to one. The operator must explicitly confirm which instance to use.

### Active instance

Once selected, the active instance becomes a UI state choice, not a rewrite of deployment configuration. The frontend stores only the chosen instance identity and safe metadata needed for display.

### Editing

This design leaves room for future UI editing of instance metadata, but that is not the primary path in the first pass. The first pass should optimize for reliable deployment wiring rather than building a full runtime instance editor.

## Error handling and safety rules

### Startup validation

The backend should fail fast when configuration is invalid. Examples:

- missing public or admin URL when required
- invalid admin authentication combination
- malformed URLs
- duplicate instance IDs

The system must not silently invent defaults that change routing behavior.

### Runtime behavior

If an admin endpoint is unreachable, rejects credentials, or returns an instance-specific failure, that error should remain explicit and scoped to the chosen instance. The system must not:

- auto-fallback to a different configured instance
- downgrade admin operations to public behavior without telling the operator
- silently clear the operator's selection and bind to another instance

If a previously selected instance no longer exists after a redeploy, the frontend should return to the explicit instance-selection state.

## Testing strategy

### Backend

Add coverage for:

- configuration parsing and validation
- instance lookup by selected ID
- secret-backed admin authentication handling
- failure cases such as missing admin URLs or invalid credentials

### Frontend

Add coverage for:

- no-auto-link initial state
- explicit instance selection flow
- invalidated selection after configuration changes
- display of configured instance metadata without exposing secrets

### End-to-end

Add integration coverage for:

- a multi-instance deployment shape
- distinct public and admin endpoints
- backend routing to the correct admin target for the selected instance
- regression proof that admin credentials never appear in browser-visible payloads

## Non-goals

This design does not define:

- the exact UI terminology cleanup for TAs/IAs or authority hints
- trust marks wording and grace-period content fixes
- issuance additional-claims redesign
- subordinate entity taxonomy changes

Those belong in separate specs so this deployment track can stay focused and implementable.

## Future follow-on tracks

After this deployment/configuration track lands, the remaining feedback should be handled as separate specs and implementation plans in this order:

1. **UI terminology and navigation cleanup** — align labels such as TAs, IAs, authority hints, superior authorities, and subordinates with spec language and operator expectations.
2. **Subordinates and entity-type modeling** — support richer subordinate typing, multi-type entities, and move intermediate handling into the subordinate flow.
3. **Trust marks UX and semantics** — correct lifetime/expiry wording and align trust-mark descriptions with actual behavior.
4. **Trust mark issuance and claims management** — support both trust-mark-level and subject-level additional claims, fix broken claim editing, and surface existing claim data.
5. **Subject lifecycle/status management** — fix inactive/suspended status handling and make subject status transitions explicit.
6. **General product cleanup and polish** — clean up remaining inconsistencies once the main flows above have stable designs.

That sequencing keeps infrastructure and routing changes first, then terminology and data-model cleanup, and only after that the more detailed trust-mark and issuance UX work.

## Configuration format

The recommended operator experience is a **configuration file with environment-variable overrides**. That keeps multi-instance definitions readable in one place while still fitting container and secret-management workflows. Regardless of how values arrive, the backend must normalize them into one in-memory instance registry so the system still has a single source of truth.
