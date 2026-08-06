# Federation Topology

How instances are declared, how to add one, and the multi-instance setups
this repo ships out of the box.

## Trust Anchors page model

The **Trust Anchors** page presents a read-only view of the deployment
topology — there is no runtime trust-anchor creation or deletion through
the UI.

| Section | Behaviour |
|---------|-----------|
| **My Instances** | Shows instances mirrored from `backend/config/gateway.yaml`. Read-only; no Add/Edit/Delete actions. |
| **Authority Hints** | Fully managed in the UI (add / remove). |
| **Registered Intermediates** | Managed through the Subordinates flow; no direct creation from this page. |

`docker-compose.yml` defines runtime service topology (ports, networks). It
does **not** create product-visible instances — those are declared
exclusively in `backend/config/gateway.yaml`.

## Adding another LightHouse instance

`docker-compose.yml` already ships with two instances (`ta-1` / LightHouse
on `8081`, `ta-2` / LightHouse 2 on `8082`) — use them as the template for a
third. Both currently reuse the same `LIGHTHOUSE_ADMIN_USERNAME` /
`LIGHTHOUSE_ADMIN_PASSWORD` env vars (see `backend/config/gateway.yaml`);
give a new instance its own pair if it needs separate credentials.

1. Create `lighthouse3/config.yaml` (copy `lighthouse2/config.yaml` and
   change `entity_id`) and a `lighthouse3/data/` directory with a
   `.gitkeep` placeholder.
2. Add a `lighthouse3` service to `docker-compose.yml`, following the
   `lighthouse2` service as a template (same image, new port, new volume
   paths).
3. Add the instance to `backend/config/gateway.yaml`:
   ```yaml
   instances:
     - id: ta-1
       name: LightHouse
       # ... existing config
     - id: ta-2
       name: LightHouse 2
       # ... existing config
     - id: ta-3
       name: LightHouse 3
       public_base_url: http://localhost:8083
       admin_base_url: http://lighthouse3:8080
       public_port: 8083
       admin_port: 8080
       admin_auth:
         type: basic
         username_env: LIGHTHOUSE_ADMIN_USERNAME
         password_env: LIGHTHOUSE_ADMIN_PASSWORD
   ```
4. Restart: `docker compose down && docker compose up --build --force-recreate`.

**`entity_id` matters more than it looks.** If this new instance ever needs
to be reachable *from another LightHouse container* (not just from your own
browser) — e.g. as part of a trust chain — its `entity_id` must be a
docker-network hostname (`http://lighthouse3:8080`), not `localhost`. See
the mesh below for why.

## Small LightHouse mesh (real multi-hop federation)

`ta-1`/`ta-2` above are two *independent* trust anchors with no relationship
between them. For testing real multi-hop trust chains and trust-mark
delegation, `docker-compose.yml` also ships a small **mesh** — four more
LightHouse containers wired into an actual hierarchy:

```
mesh-ta (root TA, :8090)  →  mesh-ia (Intermediate, :8091)  →  mesh-leaf-op (:8092, Subject)
                                                             →  mesh-leaf-rp (:8093, verifier)
```

Unlike `scripts/seed-demo.py` (which registers fake subordinates with
throwaway generated keys — fine for populating list/table UIs, but not real
enough to actually walk a chain), every mesh node is a real running
LightHouse with its own signing key, and each `entity_id` uses the
container's docker-network hostname (e.g. `http://mesh-ta:8080`, not
`localhost`) so the containers can genuinely fetch each other's entity
configurations.

```bash
docker compose up -d mesh-ta mesh-ia mesh-leaf-op mesh-leaf-rp
python3 scripts/seed-mesh.py   # idempotent — safe to re-run
```

The script registers each child as a real subordinate of its parent (using
the child's actual public JWKS, fetched from its own entity configuration),
sets authority hints, and issues a trust mark owned by `mesh-ta`, issued by
`mesh-ia`, held by `mesh-leaf-op` — printing example `curl` commands for
verifying the resolved chain and the mark's status when it's done. `mesh-ta`
and `mesh-ia` are also registered in `backend/config/gateway.yaml`, so you
can drive the same scenario from the app's instance switcher instead.

Note: Chain Inspector's "Any Entity" ad-hoc mode and the live trust-mark
status checker won't work against mesh entity_ids — see `KNOWN-ISSUES.md`.

(A best-effort background probe on backend startup — `probe_entity_id` in
`backend/app/utils/capability_probe.py` — fetches each instance's own entity
configuration and corrects its stored `entity_id` if it differs from
`public_base_url`, which is what makes "Via Trust Anchor" resolve work
correctly out of the box for mesh nodes without any manual override.)

## mesh2: a second, independent mesh (interfederation testing)

The mesh above is one hierarchy. To test genuine **interfederation**
scenarios — trust between two federations that share no root — there's a
second, fully independent mesh:

```
mesh2-ta (root TA, :8094)  →  mesh2-ia (Intermediate, :8095)  →  mesh2-leaf-op (:8096, Subject)
```

`mesh2-leaf-op` has no authority_hint path to `mesh-ta`/`mesh-ia`, no
shared root — nothing. That's the point: it's used to exercise the one
real distinction the OIDF spec draws for cross-federation trust:

- **Trust marks are issuer-authoritative** — an issuer can mark any
  subject entity_id, regardless of which (if any) hierarchy it belongs
  to. `scripts/seed-mesh2.py` has `mesh-ia` (the *other* mesh's issuer)
  mark `mesh2-leaf-op` directly, and confirms the status check succeeds.
- **Chain resolution is not** — there's no spec mechanism that makes
  `/resolve` cross an unrelated root. The same script confirms resolving
  `mesh2-leaf-op`'s chain through `mesh-ta` as anchor correctly fails
  (`404 invalid_trust_chain`).

```bash
docker compose up -d mesh2-ta mesh2-ia mesh2-leaf-op
python3 scripts/seed-mesh.py    # if you haven't already — mesh2's seed script reads its issuer
python3 scripts/seed-mesh2.py   # idempotent — safe to re-run
```

`mesh2-ta` and `mesh2-ia` are registered in `backend/config/gateway.yaml`
the same way as the first mesh's. In the app: switch to "Mesh - Intermediate"
and open Trust Marks → Issuance to see `mesh2-leaf-op` listed as a subject
right alongside `mesh-leaf-op`, on the same issuance spec.

This still doesn't cover *every* OIDFed workflow — there's no spec
mechanism for automatic trust propagation across independent roots (that's
inherent to the spec, not a gap here), and both meshes stay on plain HTTP /
docker-network hostnames, so real HTTPS/public-DNS resolution is still only
validated by the real `testbed.oidf.lab.surf.nl` round-trip (see
`KNOWN-ISSUES.md`).
