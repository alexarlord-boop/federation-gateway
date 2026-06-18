# Shared PoA Ledger for EUDI Wallet Credential Status
**GÉANT Trust & Identity Incubator — Cycle 12 Proposal (Alternative)**

---

## Problem Statement

eIDAS 2.0 mandates that EU member states provide citizens with a digital wallet (EUDI Wallet) capable of holding verifiable credentials — academic qualifications, professional licences, student IDs. GÉANT member institutions are likely issuers and relying parties in this ecosystem.

Verifiable credentials require a **credential status mechanism**: a way for a verifier to check whether a credential has been revoked or suspended since issuance, without querying the issuer directly at the time of verification.

The current dominant approach is **Status List 2021** (and its successor, Bitstring Status List): the issuer hosts an HTTP endpoint that returns a bit-vector encoding credential statuses. This works, but carries operational risks:

- The issuer's HTTP endpoint becomes a liveness dependency for every verification event
- Availability failures at the issuer break credential verification ecosystem-wide
- The endpoint leaks correlation information (verifiers querying the same URL can be fingerprinted)
- Cross-institution credentials (e.g. a student credential co-issued by an NREN and a university) require coordinated revocation with no shared infrastructure

A **shared, consortium-operated ledger** for credential status could address these problems — if the validator set is inherently trustworthy and the operational overhead is manageable.

NRENs are unusually well-suited to operate such a ledger. They are already legally accountable, technically sophisticated entities with high-availability network infrastructure and established governance relationships. A **Proof-of-Authority chain** where each participating NREN is a named validator provides Byzantine fault tolerance without the energy cost or permissionless complexity of PoW/PoS chains.

---

## Why PoA, Not a Monitored Database

The core question any GÉANT reviewer will ask: *what does the chain give you that a replicated database doesn't?*

The answer in this specific context:

| Property | Replicated DB | PoA Ledger |
|---|---|---|
| Tamper-evident audit trail | Only with extra logging infrastructure | Inherent — each block is hash-linked |
| No single operator controls revocation | Hard to enforce at protocol level | Enforced by consensus — N validators must agree |
| Cross-institution write governance | Requires bilateral API agreements | Unified smart contract defines rules for all participants |
| Verifier can audit full revocation history | Typically not exposed | Public by default |
| Liveness if one NREN's infra fails | Depends on replication config | Tolerates up to ⌊(n−1)/3⌋ validator failures |

The tamper-evidence and shared write governance properties are where the ledger earns its complexity. A university cannot unilaterally "un-revoke" a credential once the revocation is committed and confirmed by the validator quorum.

---

## Scope for Cycle 12

Six sprints of five weeks each, in three phases:

### Phase 1 — Protocol Design and Validator Setup (Sprints 1–2)

- Select and evaluate an appropriate PoA client: **Hyperledger Besu** (EVM-compatible, well-documented, GÉANT-adjacent CLIQUE/QBFT support) or **Quorum** as alternatives
- Define the **validator set governance model**: initial NRENs, onboarding procedure for new validators, off-boarding procedure
- Design the **credential status smart contract** interface:
  - `issue(credentialId, issuerDID, expiry)` — register a credential on issuance
  - `revoke(credentialId, reason)` — revoke with an immutable reason code
  - `suspend(credentialId)` / `reinstate(credentialId)` — temporary suspension (eIDAS 2.0 requirement)
  - `status(credentialId)` → `{active | revoked | suspended}` — query without revealing verifier identity
- Specify the **off-chain indexer**: a lightweight service that mirrors on-chain status into a queryable API compatible with the W3C Bitstring Status List response format, for verifiers that cannot query a chain directly
- Deploy a testnet with at least two NREN validators and a simulated issuer

**Target:** A documented protocol design and a running testnet, suitable for community review and early integration testing.

### Phase 2 — Issuer Integration and Verifier Compatibility (Sprints 3–4)

- Develop an **issuer SDK** (TypeScript/Python) for:
  - Registering credentials on-chain at issuance time
  - Submitting revocation/suspension transactions with operator confirmation
  - Generating W3C-compatible `credentialStatus` claim pointing to the on-chain record
- Develop the **off-chain indexer** service with a Status List 2021-compatible HTTP endpoint, so existing OID4VC verifier implementations work without modification
- Integration with at least one OID4VC-compatible wallet as a reference verifier (e.g. EUDI Reference Wallet or Sphereon)
- Privacy analysis: confirm that on-chain queries do not leak verifier identity to issuers (unlinkability requirement under eIDAS 2.0)

**Target:** A working end-to-end flow — credential issuance, on-chain registration, revocation, and verifier status check — demonstrated in a controlled environment. Scope may narrow depending on SDK complexity and wallet integration availability.

### Phase 3 — Governance Model and Community Output (Sprints 5–6)

- Draft a **GÉANT validator participation agreement**: legal-lite governance document specifying validator obligations, SLA expectations, and exit procedures
- Define **onboarding runbook** for a new NREN joining as a validator
- Deploy a **public testnet dashboard**: block explorer scoped to the credential status contract, showing recent activity without exposing credential identifiers
- Community demo and written assessment: where this approach is stronger than Status List 2021, where the operational overhead may not be justified, and what would be needed to move toward a production deployment

**Target:** An honest community assessment and a governance model that could support a production pilot in a follow-on cycle — not a production deployment claim.

---

## Why TII / Why Now

**Regulatory driver:** eIDAS 2.0 implementation timelines are forcing GÉANT member institutions to make wallet infrastructure decisions in 2026–2027. Building shared revocation infrastructure now — rather than each NREN independently deploying fragile HTTP endpoints — is more efficient if the community can align.

**GÉANT validator fit:** The PoA model only works if the validator set is inherently trustworthy. NRENs are one of the few environments where that precondition is already satisfied by existing governance relationships, without needing to build trust from scratch.

**Narrow, testable scope:** This proposal makes no broad claims about "blockchain for identity." The scope is deliberately limited: credential status, for EUDI wallets, operated by NRENs. That narrowness makes it feasible to evaluate rigorously in one cycle.

**Honest open questions:** Whether the operational overhead justifies the tamper-evidence properties at GÉANT scale is not predetermined. The Phase 3 community assessment is designed to answer that question honestly, not to advocate for a predetermined outcome.

---

## Resources Requested

| Resource | Purpose |
|---|---|
| 1 TIM participant (backend / blockchain) | Smart contract, indexer, issuer SDK |
| 2–3 NREN validator nodes (testnet only) | Realistic multi-validator testing |
| Access to an OID4VC-compatible wallet for integration testing | End-to-end verification flow |
| Community feedback slots | Mid-cycle design review, final demo |

---

## Relationship to OIDFed Operator Platform Proposal

This proposal is independent of the OIDFed Operator Platform (separate Cycle 12 proposal). However, the two are complementary:

- The Operator Platform handles **entity-level trust** in the OIDFed hierarchy (who is a legitimate federation participant)
- This proposal handles **credential-level trust** within that hierarchy (is a specific credential still valid)

An NREN running both would have: an OIDFed node managed via the Operator Platform, with credential status for issued EUDI credentials anchored to the shared PoA ledger. The two systems share no code but share governance philosophy — NREN-operated, GÉANT-governed.

If only one proposal advances, they are designed to stand alone.

---

## What This Is Not

- Not a general-purpose identity blockchain
- Not a replacement for OIDFed entity statements or trust hierarchies
- Not a production deployment claim — Cycle 12 targets a validated testnet and community assessment
- Not an advocacy position for blockchain-over-database in general; the Phase 3 assessment will include an honest comparison

---

*Prepared for GÉANT T&I Incubator Cycle 12 kick-off, May 27–29 2026.*
*Contact: Aleksandr Petrunin*
