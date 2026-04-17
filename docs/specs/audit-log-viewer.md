# Feature Spec: Audit Log Viewer

## Problem

The BFF capabilities manifest claims `"audit_logging": true` — but this is
**a hardcoded lie**. There is no audit log storage, no audit log endpoint, and no
UI. The `capabilities.py` file has:

```python
extensions={
    "audit_logging": True,   # ← hardcoded; no implementation behind it
    ...
}
```

Federation operators need to answer questions like:
- *"Who approved entity X and when?"*
- *"Who changed the constraints policy yesterday?"*
- *"Was there any key rotation in the last week?"*

Without an audit trail, incidents are undiagnosable and compliance requirements
(e.g. GDPR, ISO 27001) cannot be met.

## Goal

1. **Implement real audit logging** in the BFF — record every mutating admin action
   (create, update, delete, approve, reject) with actor, timestamp, action, resource.
2. **Add an Audit Log page** in the UI where admins can search, filter, and
   paginate through the log.
3. **Fix the capability claim** — set `audit_logging: true` only once the
   implementation exists, or remove it until then.

---

## What to log

Every HTTP request that mutates state should produce an audit record.

### Audit record schema

```json
{
  "id": "uuid",
  "timestamp": "2026-04-17T12:00:00Z",
  "actor": "admin@example.org",
  "action": "entity.approve",
  "resource_type": "entity",
  "resource_id": "https://entity.example.org",
  "resource_label": "Example RP",
  "outcome": "success",
  "details": { "previous_status": "pending", "new_status": "active" },
  "ip_address": "1.2.3.4",
  "user_agent": "Mozilla/5.0 ..."
}
```

### Action taxonomy

| Prefix | Examples |
|---|---|
| `entity.*` | `entity.register`, `entity.approve`, `entity.reject`, `entity.delete`, `entity.status_change` |
| `trust_mark.*` | `trust_mark.issue`, `trust_mark.revoke`, `trust_mark.type_create`, `trust_mark.type_delete` |
| `settings.*` | `settings.constraint_create`, `settings.policy_update`, `settings.key_rotate` |
| `rbac.*` | `rbac.role_create`, `rbac.role_delete`, `rbac.permission_grant`, `rbac.permission_revoke` |
| `user.*` | `user.create`, `user.delete`, `user.password_change`, `user.login`, `user.logout` |
| `trust_anchor.*` | `trust_anchor.create`, `trust_anchor.delete`, `trust_anchor.config_update` |

---

## BFF changes needed

### 1. Database model (`backend/app/models/audit.py`)
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id           = Column(String, primary_key=True, default=lambda: str(uuid4()))
    timestamp    = Column(DateTime, default=datetime.utcnow, index=True)
    actor        = Column(String, index=True)
    action       = Column(String, index=True)
    resource_type = Column(String)
    resource_id   = Column(String, nullable=True)
    resource_label = Column(String, nullable=True)
    outcome       = Column(String, default="success")  # success | failure
    details       = Column(JSON, nullable=True)
    ip_address    = Column(String, nullable=True)
    user_agent    = Column(String, nullable=True)
```

### 2. Audit middleware or decorator
A FastAPI middleware (or per-route decorator) that writes an `AuditLog` row
after every `POST`, `PATCH`, `PUT`, `DELETE` request with a 2xx response.

```python
# backend/app/middleware/audit.py
class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method in ("POST", "PATCH", "PUT", "DELETE") \
           and 200 <= response.status_code < 300:
            # Extract actor from JWT in Authorization header
            # Write AuditLog row
            ...
        return response
```

### 3. Audit query endpoint (`backend/app/routers/audit.py`)
```
GET /api/v1/audit?from=&to=&actor=&action=&resource_type=&page=&limit=
```
Returns paginated list of audit records. **Requires `rbac:manage` permission.**

### 4. Fix capability claim
```python
# capabilities.py
"audit_logging": True,   # only once AuditMiddleware is wired in
```

---

## Proposed UI

### Location
New top-level page: `/audit` — *Organization → Audit Log* in the sidebar.
Visible only to users with `rbac:manage` permission (same guard as RBAC page).

### Layout

**Filter bar** (top)
```
From: [date]   To: [date]   Actor: [email or *]   Action: [select ▾]   Resource: [text]
[Apply]  [Clear]
```

**Log table**
| Timestamp | Actor | Action | Resource | Outcome |
|---|---|---|---|---|
| 2026-04-17 12:05 | admin@… | entity.approve | Example RP | ✅ success |
| 2026-04-17 11:50 | ops@… | trust_mark.issue | https://tm.example.org | ✅ success |

- Clicking a row opens a **detail drawer** with the full JSON (including `details` diff).
- Outcome badge: green for success, red for failure.
- Actions dropdown filter groups by prefix (`entity.*`, `trust_mark.*`, etc.).

**Pagination** — cursor-based, 50 rows per page.

**Export** — "Download CSV" button for the current filter window.

---

## Data fetching

```typescript
// src/hooks/useAuditLog.ts
useQuery({
  queryKey: ['audit-log', filters],
  queryFn: () => fetch(`/api/v1/audit?${new URLSearchParams(filters)}`).then(r => r.json()),
  staleTime: 30_000,
})
```

No polling — audit log is append-only; operator refreshes manually or paginates.

---

## Gaps / Caveats

- **Retroactive coverage** — existing actions before the middleware is deployed will
  not appear in the log. First log entry will be the deploy date.
- **LightHouse-side actions** — operations performed directly via LightHouse's native
  admin API (bypassing the BFF) are NOT captured. Only BFF-mediated actions are logged.
  This is an acceptable scope: the BFF is the intended management surface.
- **Proxy calls** — all LightHouse admin mutations go through
  `/api/v1/proxy/{instance_id}/{path}`. The audit middleware must also capture these
  (recording the proxied path as the resource).
- **Storage** — the BFF already uses SQLite (`backend.db`). For high-volume federations
  the audit table can grow large; add a retention policy (default: keep 90 days).
- **`audit_logging: true` is currently a false claim** — the capability must be
  corrected immediately (set to `False`) until the implementation is live, to avoid
  misleading operators and integrators.

---

## Implementation checklist

- [ ] Fix capability claim: set `audit_logging: False` until implemented
- [ ] Add `AuditLog` SQLAlchemy model + Alembic migration
- [ ] Implement `AuditMiddleware` — captures POST/PATCH/PUT/DELETE + actor
- [ ] Handle proxy route: extract proxied path + method for resource identification
- [ ] Add `GET /api/v1/audit` endpoint with pagination + filtering
- [ ] Add `useAuditLog` hook
- [ ] Add `AuditLogPage` (`src/pages/AuditLogPage.tsx`)
- [ ] Add sidebar link: *Organization → Audit Log* (guarded by `rbac:manage`)
- [ ] Add route `/audit` in router config
- [ ] Filter bar (date range, actor, action prefix, resource text)
- [ ] Audit detail drawer (full JSON diff view)
- [ ] CSV export button
- [ ] e2e test: audit page accessible to admin; entry appears after entity action
