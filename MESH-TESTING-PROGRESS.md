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

- [x] Metadata Policy applied by an intermediate to a subordinate's
  metadata during resolution (§6.1) — `mesh-tests/test_metadata_policy.py`.
  Works correctly once you use the real mechanism: each subordinate has
  its own `metadata_policy` snapshot, explicitly synced from the general
  policy via `POST /subordinates/{id}/metadata-policies` — not computed
  live on every request (an earlier "just caching, restart fixes it"
  theory was wrong; see investigation notes below). Also surfaced a real
  bug: setting per-subordinate *constraints* has the unrelated side effect
  of permanently freezing that subordinate's metadata policy — tracked in
  `docs/KNOWN-ISSUES.md`, not filed upstream yet.
- [x] Constraints (`max_path_length`, naming/entity-type restrictions,
  §6.2) actually enforced during resolution — `mesh-tests/test_constraints_enforcement.py`.
  `naming_constraints` confirmed working: excluding an authority's
  hostname makes resolution through it fail with `invalid_trust_chain`.
  `allowed_entity_types` and `max_path_length` are correctly implemented
  in `go-oidfed/lib`'s `checkConstraints()` (confirmed in source) but
  can't be meaningfully proven against *this* mesh's topology — no leaf
  publishes real typed metadata (only `federation_entity`, so entity-type
  constraints trivially pass), and the mesh is only 2 levels deep (no
  path-length limit can bite). Not a bug, just an infra limitation — see
  investigation notes below. Registration itself (`POST /subordinates`)
  is not gated by constraints, by design — enforcement is a resolution-time
  concern, not a write-time validation.

## C. Trust Marks (§7)

- [x] Issuance (issuer → subject) — `scripts/seed-mesh.py`/`seed-mesh2.py`
- [x] Status check (issuer-authoritative, no chain needed) — POST
  `/trust_mark/status`, confirmed 200
- [x] Cross-federation issuance (interfederation) — `mesh-ia` marks
  `mesh2-leaf-op` directly, confirmed live
- [x] Trust Mark Delegation — issuer ≠ owner via `trust_mark_owners` on
  the TA (§7.2). `mesh-tests/test_trust_mark_delegation.py` — works
  correctly end-to-end: owner registration → discovery via the TA's own
  entity config → delegation JWT embedded in every issued mark → full
  relying-party-style verification (signature checked against the
  *discovered* owner key, not a locally held one). One real minor bug
  found along the way (owner entity_id not released after delete) — see
  investigation notes below and `docs/KNOWN-ISSUES.md`.
- [x] Trust Marked Entities Listing (`federation_trust_mark_list_endpoint`,
  §8.5) — `mesh-tests/test_trust_marked_entities_listing.py`. Works
  correctly: lists active holders, the optional `sub` filter narrows to
  one entity, and a blocked subject is immediately excluded — consistent
  with C6's revocation finding, not a separate code path that could
  disagree with it. No bug found.
- [x] Revocation/expiry transition — `mesh-tests/test_trust_mark_revocation_expiry.py`.
  Revocation works correctly: blocking a `TrustMarkSubject` flips an
  already-issued mark's status check to `"revoked"` and blocks fresh
  issuance with 403. Expiry does **not**: a genuinely expired mark
  (valid signature, only `exp` passed) is reported as `"invalid"`
  instead of the spec-defined `"expired"` (§8.4.2) — real bug, not filed
  upstream yet, see investigation notes below and `docs/KNOWN-ISSUES.md`.

## D. Federation endpoint completeness (§8, §11)

- [ ] Federation Historical Keys endpoint (§8.7) — no key rollover
  exercised anywhere, so old-signature verification is untested
- [ ] Key rollover for a TA (§11.2) or any entity (§11.1)
- [ ] Subordinate revocation propagating correctly — confirmed **broken**,
  not just untested: `mesh-tests/test_subordinate_revocation.py`. Blocking
  a subordinate is correctly excluded from `/list` but `/resolve` still
  returns a fully valid signed trust chain for it. Filed upstream against
  `go-oidfed/lighthouse`, tracked in `docs/KNOWN-ISSUES.md`. The test
  documenting this asserts today's actual (wrong) behavior so the suite
  stays green until the upstream fix ships — see that test's docstring.

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

~~Metadata Policy (B) and subordinate revocation (D) carry the most real
product risk if silently broken~~ — done, see `mesh-tests/` and the
investigation notes below. ~~Trust Mark Delegation (C) is next most
valuable~~ — also done, works correctly end-to-end. ~~Revocation/expiry
transition (C6)~~ — also done; revocation works, expiry does not
(misreports as `invalid`, see investigation notes). ~~Trust Marked
Entities Listing (C5)~~ — also done, works correctly, no bug.
~~Constraints enforcement (B2)~~ — also done; `naming_constraints`
confirmed working, the other two sub-mechanisms are correctly implemented
in source but need mesh topology this repo doesn't have yet to prove live
(see notes below). **Sections B and C are now fully covered, plus D3.**
Key rollover (D1/D2) is what's left.

Four real product gaps found across all of this, not one — worth stating
plainly since the *first* pass (metadata policy) initially looked clean
and only turned out not to be once later tests started interacting with
the same subordinate. See `docs/KNOWN-ISSUES.md` for full repro detail on
each: `/resolve` ignores blocked status; trust mark owner `entity_id`
isn't released after delete; expired trust marks report `invalid` instead
of `expired`; and `constraints` `PUT` silently freezes a subordinate's
metadata policy.

## Investigation notes: `mesh-tests/` findings (2026-08-13 – 2026-08-15)

Dug into each before or while writing formal tests, to separate "our test
setup is wrong" from "the product has a real gap" — full detail in
`docs/KNOWN-ISSUES.md`. The metadata-policy one below is flagged
specifically because the *first* version of this note was itself wrong —
worth reading if only as a reminder that "restarting the container rules
out caching" is not a safe assumption against this product.

- **Metadata policy — corrected finding.** Originally concluded this was
  "just caching, restart fixes it" (an in-process cache on `mesh-ia`,
  tied to a statement's `exp`). That was wrong on two counts, found only
  after the test started failing depending on which other tests had run
  first in the same session. First: `docker compose restart mesh-ia`
  does **not** clear whatever state this actually is — confirmed directly
  by inspecting `mesh-ia/data/lighthouse.db` with `sqlite3`, the state
  survives a restart byte-for-byte, because it's a persisted SQLite
  column, not an in-process cache. Second, and the real mechanism: each
  subordinate has its own `metadata_policy` column, independent of the
  general policy. It starts `NULL` (in which case `/fetch` genuinely does
  compute live from the general policy — this is what the original,
  narrower manual tests happened to always see), but gets permanently
  materialized to a frozen snapshot the moment `PUT
  /subordinates/{id}/constraints` is called on that subordinate — an
  unrelated admin action with an undocumented side effect. The real,
  intended sync mechanism is `POST /subordinates/{id}/metadata-policies`
  ("copy general metadata policies to subordinate"), the same explicit
  pattern constraints itself uses (`copyGeneralConstraintsToSubordinate`).
  `mesh-tests/test_metadata_policy.py` now calls that explicitly instead
  of assuming propagation is automatic or restart-able. The freeze
  side-effect itself is tracked as a real bug in `docs/KNOWN-ISSUES.md`.
- **Subordinate revocation.** Still a confirmed real bug — but the
  original justification ("ruled out caching by restarting first") no
  longer holds now that restart is known not to clear anything. The
  actual solid evidence is static, not empirical: `go-oidfed/lib`'s
  `trustresolver.go` has zero references to subordinate `status` anywhere
  in its chain-walking logic — a code path that never reads a field
  cannot be affected by that field being stale. Blocking a subordinate is
  correctly excluded from `/list`, but `/resolve` still returns a
  complete, validly signed trust chain for it. Filed upstream against
  `go-oidfed/lighthouse`.
- **Constraints enforcement.** `naming_constraints` confirmed genuinely
  live, not a stale artifact: resolution through an authority *changed*
  from succeeding to failing (`invalid_trust_chain`) the moment its
  hostname was added to an excluded list — a real state transition,
  which a stale cache cannot produce (it would keep returning the old
  result, not spontaneously start returning a new error). `checkConstraints()`
  in `go-oidfed/lib`'s `trustresolver.go` correctly implements all three
  sub-mechanisms (`max_path_length`, `naming_constraints`,
  `allowed_entity_types`) — confirmed in source. `allowed_entity_types`
  couldn't be proven live against this mesh specifically: it's checked
  against entity types *guessed from an entity's own published metadata
  claims*, and every mesh-* leaf only ever publishes a bare
  `federation_entity` block (none run real `openid_provider`/
  `openid_relying_party` endpoints), and `federation_entity` is
  unconditionally exempt from the constraint — so it trivially passes
  regardless of configuration, on every entity in the mesh today.
  `max_path_length` needs a 3-level hierarchy to exceed any meaningful
  limit; the mesh is 2 levels deep. Neither is a product bug — the mesh's
  topology just doesn't give them anything to bite on yet (mesh-ia2, in
  the earlier test-infra diagram's "planned" set, would unblock
  `max_path_length`; a leaf with real typed metadata would unblock
  `allowed_entity_types`).
- **Trust Mark Delegation.** Works correctly. LightHouse's admin API has
  no endpoint to mint a delegation JWT on an owner's behalf and never
  exposes any instance's real private key, so proving this end-to-end
  meant fabricating a standalone owner identity (throwaway EC keypair,
  `python-jose` — already in `backend/requirements.txt`) and hand-signing
  a delegation JWT per `go-oidfed/lib`'s `DelegationJWT` struct
  (`iss`/`sub`/`trust_mark_type`/`iat`/`exp`, `typ: trust-mark-delegation+jwt`).
  Confirmed all of: owner registration is published in the *owning*
  instance's own entity config under `trust_mark_owners` (the spec's real
  discovery mechanism — no local registration needed on a verifier's
  side); the delegation JWT gets embedded verbatim in every mark the
  issuer subsequently issues; and a full relying-party-style check
  (rediscover the owner's jwks from the TA's published config, not from
  memory, then verify the signature against *that*) succeeds. Found one
  minor real bug along the way: deleting a trust mark owner doesn't
  release its `entity_id` for reuse (409 on next `POST` with the same id,
  even though every read/list endpoint shows it gone) — worked around
  with a fresh `entity_id` per test, tracked in `docs/KNOWN-ISSUES.md`,
  not filed upstream yet.
- **Trust mark revocation/expiry.** Split result. Revocation (blocking a
  `TrustMarkSubject` via `PUT .../subjects/{id}/status`) works correctly:
  an already-issued mark's status check flips to `"revoked"`, and a fresh
  issuance attempt for a blocked subject 403s. Expiry does not: confirmed
  against the actual normative spec text (§8.4.2, not recalled) that
  `expired` ("the Trust Mark has expired") and `invalid` ("signature
  validation failed or another error was detected") are distinct defined
  values — a mark issued with a 2-second `lifetime`, left to expire with
  a valid signature and nothing else wrong, is reported as `"invalid"`
  rather than `"expired"`. Real spec-compliance bug, tracked in
  `docs/KNOWN-ISSUES.md`, not filed upstream yet (lower priority than the
  `/resolve` one — a relying party would still correctly treat the mark
  as no good, just for the wrong stated reason).
- **Trust Marked Entities Listing.** Works correctly, no bug. Lists
  active holders of a type, the optional `sub` query param narrows to one
  entity, and a blocked subject is immediately excluded from the list —
  the same result C6 found via the status/fresh-issuance paths, confirming
  listing isn't a separate code path that could silently disagree with
  them. One methodological note: listing reflects the *last issued* mark's
  validity, not just current subject status — a mark that expired since
  it was last fetched won't reappear until a new one is issued, so the
  tests fetch a fresh mark before asserting inclusion.
