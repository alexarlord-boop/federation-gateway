# OIDFed Operator Platform
**GÉANT Trust & Identity Incubator — Cycle 12 Proposal**

---

## Problem Statement

OpenID Federation 1.0 was finalized in February 2026. With the protocol now stable, attention is shifting toward adoption — and adoption depends on operational readiness as much as technical compliance.

Running an OIDFed federation node — whether as a Trust Anchor, Intermediate Entity, or Trust Mark Issuer — involves managing cryptographic entity statements, metadata policies, subordinate approval workflows, trust mark issuance, and key rotation across a hierarchy of federation participants. The spec defines the *what*; it leaves the *how* of day-to-day operations largely to implementers.

At present, most operators interact with federation nodes via config files and direct API calls. Community-maintained tooling for the operator layer is still limited — there is little shared infrastructure for multi-instance monitoring, expiry alerting, or guided onboarding workflows. NRENs building OIDFed infrastructure tend to solve these problems independently.

Addressing this gap seems likely to support eduGAIN's broader OIDFed migration goals, and is the motivation for this proposal.

---

## Existing Prototype

A working prototype was developed during TIM Cycle 11 and is available for live demonstration at the kick-off:

- **Admin UI** — React/TypeScript single-page application covering entity registration, subordinate management, trust mark CRUD, entity configuration inspection, and role-based access control
- **Backend-for-Frontend** — Python FastAPI service providing JWT authentication, RBAC enforcement, multi-instance proxy routing, and deployment configuration management
- **OpenAPI contract** — Full `Federation Admin OpenAPI.yaml` aligned to the OIDFed 1.0 Admin API, used as the single source of truth for both the UI client and backend validation
- **Multi-instance architecture** — `gateway.yaml` registry supporting multiple named LightHouse instances; the proxy layer routes admin operations to the correct instance with credential injection
- **Reference deployment** — Two LightHouse instances running in Docker Compose, fully wired to the gateway

A deployable, demo-able prototype exists today — the proposal starts from working code, not a design document.

---

## Scope for Cycle 12

Six sprints of five weeks each, organized into three phases:

### Phase 1 — Production-Ready Admin UI (Sprints 1–2)

The prototype UI covers the core entity management workflows but has known gaps for production use:

- Complete the subordinate entity lifecycle: registration → review → approval/rejection → statement issuance
- Trust mark owner and issuer management with delegation support (per OIDFed §7.2)
- Metadata policy editor with operator validation (`subset_of`, `superset_of`, `value`, `essential`)
- Key management UI: rotate, revoke, view historical keys (per OIDFed §8.7)
- Audit log viewer with filtering and export
- Accessibility, internationalisation groundwork, and white-label theming for NREN deployment

**Target:** A significantly more complete admin UI, suitable for early NREN adoption and structured community feedback — not necessarily polished for unsupported end-user deployment, but solid enough to validate the approach and surface the remaining gaps.

### Phase 2 — Platform Layer: Multi-Instance Monitoring (Sprints 3–4)

A Federation Operator running multiple LightHouse nodes (e.g. a national Trust Anchor plus several Intermediates) currently has no cross-instance visibility. Subordinate statements expire silently; key rotations in one node can break chains through another.

- **Health dashboard** — per-instance status by polling `/.well-known/openid-federation` and the Admin API
- **Expiry monitor** — background job scanning all subordinate statements across all registered instances; configurable alert thresholds before `exp` is crossed
- **Trust chain topology view** — visual DAG of the federation hierarchy assembled from the list and fetch endpoints, updated on demand
- **Key rotation coordination** — flag which trust chains are affected by a pending key change before it is committed
- **Unified audit log** — aggregate per-instance audit events into a single searchable timeline

**Target:** A "Platform Health" section in the admin UI, backed by a scheduler-driven monitoring backend, that gives operators improved cross-instance visibility. The exact feature scope will depend on findings during Phase 1 and the available integration points in LightHouse at the time of implementation.

### Phase 3 — Operator Tooling and Community Output (Sprints 5–6)

- **CLI** — `oidfed-admin` command-line tool wrapping the full Admin API, generated from the OpenAPI spec and hand-tuned for operator UX; supports scripting, bulk onboarding, and CI/CD integration
- **NREN deployment guide** — step-by-step operational runbook covering initial setup, first subordinate onboarding, key rotation procedure, trust mark issuance, and disaster recovery
- **Docker Compose and Kubernetes manifests** — reference deployment configurations for production use
- **Community demo** — public sprint demo presenting the complete platform to the GÉANT T&I community, collecting feedback for follow-on cycles

**Target:** A deployment package and operator documentation that meaningfully lowers the barrier to standing up an OIDFed operator deployment — reducing the prerequisite depth of spec knowledge and trial-and-error configuration. Community feedback from the sprint demo will shape what gets carried forward.

---

## Why TII / Why Now

**Technical moment:** OIDFed 1.0 finalization in February 2026 closed the protocol question and opened the adoption question. The tooling gap is immediate and concrete.

**Community leverage:** NRENs running OIDFed nodes tend to face similar operational challenges. A shared platform has the potential to reduce duplicated effort across GÉANT members — which is well-aligned with TII's stated mandate.

**eduGAIN alignment:** eduGAIN migration to OIDFed is a stated GÉANT priority. Operator tooling that reduces the cost of standing up and maintaining a federation node should support that migration, even if it doesn't directly accelerate the protocol work itself.

**Interoperability:** The Admin API OpenAPI contract is implementation-neutral. The UI and CLI are designed to work with any OIDFed-compliant backend, not only LightHouse — which should make the tooling useful to NRENs running alternative implementations.

**Starting point advantage:** A working prototype exists. Cycle 12 begins from sprint 1 with a deployable system, not a blank sheet.

---

## Resources Requested

| Resource | Purpose |
|---|---|
| 1 TIM participant (full-stack) | UI hardening, monitoring backend, CLI development |
| Access to GÉANT LightHouse deployment | Integration testing against a live OIDFed node |
| Community feedback slots | Mid-cycle and final sprint demos |

---

## Follow-On: Agentic Operator Tooling (Cycle 13 Horizon)

Once the platform API and monitoring layer are stable, the same infrastructure naturally enables a next step: **agentic workflows via Model Context Protocol (MCP)**.

An MCP server exposing the Admin API would allow AI assistants to handle routine federation maintenance — subordinate statement renewals approaching expiry, trust mark reissuance, key rotation coordination — with operator confirmation gates for high-risk operations. Federation operators could interact with their nodes in natural language rather than navigating a web UI.

GÉANT's own May 2026 publication *"AI agents in network orchestration: a guarded path forward"* identifies this direction as a community priority. The OIDFed admin domain — structured, spec-defined, with well-bounded operations — is a plausible early application: complex enough to benefit from agent assistance, constrained enough to think about safety systematically. Whether that's the right follow-on for Cycle 13 is an open question, but building a solid platform API in Cycle 12 keeps the option on the table.

---

*Prepared for GÉANT T&I Incubator Cycle 12 kick-off, May 27–29 2026.*
*Contact: Aleksandr Petrunin*
