# Mesh Testing Progress

Tracks OpenID Federation 1.0 spec-defined user flows against the
self-deployed mesh ecosystem (`mesh-*` + `mesh2-*`, see
`docs/FEDERATION-TOPOLOGY.md`), scoped to what a self-contained
registry+LightHouse deployment should be able to demonstrate end-to-end.
Spec: <https://openid.net/specs/openid-federation-1_0.html>. Section
numbers below are checked directly against the normative spec text, not
recalled from memory — re-verify against the actual text if a section
number ever looks off after a spec revision.

This is a checklist, not a narrative — update it in place as items move
from `[ ]` to `[x]`, with a one-line note on how it was verified (mirror
`docs/KNOWN-ISSUES.md`'s evidence-based style: what was run, what
confirmed it). Don't duplicate content into `PROGRESS.md`; that file links
here instead.

---

## A. Entity lifecycle & trust chain (§3–4, §10)

- [x] Entity publishes self-signed Entity Configuration at
  `/.well-known/openid-federation` — every mesh node
- [x] Subordinate registration by an intermediate/TA (`/fetch`, `/list`)
  — `scripts/seed-mesh.py`, `scripts/seed-mesh2.py`
- [x] Multi-hop trust chain resolution (leaf → intermediate → anchor)
  — confirmed via real `/resolve`, full `trust_chain` array returned
- [ ] Choosing among multiple valid trust chains (§10.3) — mesh is a
  strict tree; needs an entity with two independent paths to an anchor
- [ ] Trust chain expiration = min of all statement `exp`s (§10.4) —
  never asserted directly against a resolved chain
- [ ] Entity with multiple `authority_hints` (member of >1
  federation/IA at once) — every mesh node has exactly one today

## B. Metadata Policy & Constraints (§6)

- [ ] Metadata Policy applied by an intermediate to a subordinate's
  metadata during resolution (§6.1) — `mesh-ia`/`mesh2-ia` have none
  configured; never verified a policy actually mutates resolved metadata
- [ ] Constraints (`max_path_length`, naming/entity-type restrictions,
  §6.2) actually enforced — Settings "Constraints" tab exists in the UI,
  but nothing confirms a constrained intermediate is blocked from
  registering something out of bounds

## C. Trust Marks (§7)

- [x] Issuance (issuer → subject) — `scripts/seed-mesh.py`/`seed-mesh2.py`
- [x] Status check (issuer-authoritative, no chain needed) — POST
  `/trust_mark/status`, confirmed 200
- [x] Cross-federation issuance (interfederation) — `mesh-ia` marks
  `mesh2-leaf-op` directly, confirmed live
- [ ] Trust Mark Delegation — issuer ≠ owner via `trust_mark_owners` on
  the TA (§7.2). UI has an Owners tab (`OwnersTab.tsx`); never exercised
  end-to-end in the mesh
- [ ] Trust Marked Entities Listing (`federation_trust_mark_list_endpoint`,
  §8.5) — enabled in every `config.yaml`, never actually called/verified
- [ ] Revocation/expiry transition — only ever tested `status: active`;
  never confirmed a revoked/expired mark's status check reflects it

## D. Federation endpoint completeness (§8, §11)

- [ ] Federation Historical Keys endpoint (§8.7) — no key rollover
  exercised anywhere, so old-signature verification is untested
- [ ] Key rollover for a TA (§11.2) or any entity (§11.1)
- [ ] Subordinate revocation propagating correctly — status can be set
  to `blocked`/`inactive` via the UI, but never confirmed that chain
  resolution then actually fails for that entity

## E. Topology patterns (§17.1–17.2)

- [x] Multi-level hierarchy (TA → IA → leaf)
- [x] Two independent federations with no shared root or docker network
  (`mesh-*` vs `mesh2-*`, see `docs/FEDERATION-TOPOLOGY.md`)
- [ ] Entity with redundant/multiple parents
- [ ] Dedicated Resolver role distinct from the TA (§17.3, §10.6) —
  LightHouse's `/resolve` plays double duty; a standalone resolver
  entity is a distinct spec concept we haven't stood up

## Explicitly out of scope

- **OpenID Connect Client Registration, Automatic + Explicit (§12)** —
  live RP↔OP authentication trust establishment. A federation *registry*
  publishes correct, resolvable metadata; it doesn't perform OIDC logins
  itself. Listed here so it isn't mistaken for missing work later.

---

## Suggested next order

Metadata Policy (B) and subordinate revocation (D) carry the most real
product risk if silently broken — both are core admin actions already
exposed in the UI (Settings → Constraints, Metadata Policies;
EntityDetailPage status dropdown) that nothing currently proves actually
take effect during resolution. Trust Mark Delegation (C) is next most
valuable — the Owners UI exists but has no live-mesh proof it works.
