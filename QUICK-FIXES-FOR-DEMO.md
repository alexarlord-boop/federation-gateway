# Quick Fixes to Align Codebase with Demo (3-Day Timeline)

## Priority 1: MUST DO (Critical for Demo Credibility)

### 1. Fix Registration to Use Draft Status
**Issue**: Registration submits with 'active' status, but demo claims draft workflow
**File**: `src/pages/EntityRegisterPage.tsx` (line ~98)
**Fix**:
```tsx
// Change from:
status: 'active',

// To:
status: 'draft', // Submitted for review
```

**Impact**: 2 minutes
**Why**: Makes the "draft → pending → active" workflow believable

---

### 2. Add Authority Hints to Trust Anchors Page
**Issue**: Demo mentions authority_hints but there's no visible UI
**File**: `src/pages/TrustAnchorsPage.tsx`
**Fix**: Add a collapsible section showing configured authority hints
**Impact**: 30-45 minutes
**Why**: Shows Level 2 hierarchy management you mention in script

---

### 3. Update Login Page Messaging
**Issue**: Login doesn't mention the auth gateway concept
**File**: `src/pages/LoginPage.tsx`
**Fix**: Add a small info banner or footnote:
```tsx
<p className="text-xs text-muted-foreground mt-4">
  Production: Authentication via FastAPI Gateway with OIDC/SAML support
</p>
```

**Impact**: 5 minutes
**Why**: Plants the seed that this is a prototype with planned production auth

---

## Priority 2: NICE TO HAVE (Enhances Demo Polish)

### 4. Add a "Mock Mode" Indicator
**File**: `src/components/layout/AppLayout.tsx` or `AppSidebar.tsx`
**Fix**: Add a small badge in the header/sidebar:
```tsx
<span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded">
  Mock API Mode
</span>
```

**Impact**: 10 minutes
**Why**: Makes it clear you're demonstrating workflows, not a connected system

---

### 5. Show Entity Status Transitions
**File**: `src/pages/EntityDetailPage.tsx`
**Fix**: Add status management buttons (Draft → Pending → Active)
**Impact**: 45 minutes
**Why**: Demonstrates the workflow state machine you describe

---

### 6. Add .well-known Endpoint Display
**File**: `src/pages/EntityRegisterPage.tsx` (Step 1)
**Fix**: Show the constructed well-known URL below the entity_id input:
```tsx
<p className="text-xs text-muted-foreground mt-1">
  Will fetch from: <code>{formData.entityId}/.well-known/openid-federation</code>
</p>
```

**Impact**: 5 minutes
**Why**: Shows you understand the OIDFed discovery mechanism

---

## Priority 3: OPTIONAL (If Time Permits)

### 7. Add Authority Hints Management Dialog
**File**: Create new component or add to `TrustAnchorsPage.tsx`
**Fix**: Build a simple CRUD interface for authority hints
**Impact**: 2-3 hours
**Why**: Fully implements Level 2 hierarchy concept

---

### 8. Mock Fetch Delay with Progress
**File**: `src/pages/EntityRegisterPage.tsx`
**Fix**: Add progress states during the config fetch:
```tsx
setIsLoading(true);
setFetchStatus('Connecting to entity...');
await new Promise(resolve => setTimeout(resolve, 500));
setFetchStatus('Fetching .well-known/openid-federation...');
await new Promise(resolve => setTimeout(resolve, 700));
setFetchStatus('Validating entity statement...');
```

**Impact**: 20 minutes
**Why**: Makes the "dynamic fetch" feel more real

---

### 9. Add API Contract Documentation Link
**File**: `README.md`
**Fix**: Add a section referencing the OpenAPI spec:
```markdown
## API Contract

This UI is built against the Federation Admin OpenAPI specification:
- OpenAPI Spec: `Federation Admin OpenAPI.yaml`
- Mock Server: MSW handlers in `src/mocks/handlers.ts`
- Base URL: http://localhost:8765
```

**Impact**: 5 minutes
**Why**: Shows architectural discipline

---

## What NOT to Change

❌ **Don't build the actual FastAPI gateway** - Too much scope for 3 days
❌ **Don't connect to a real backend** - Mocks are fine for prototype demo
❌ **Don't implement trust mark issuance** - Already correctly scoped out
❌ **Don't refactor the entire navigation** - Current structure works

---

## Demo Day Checklist

### Before Demo (Morning Of):
- [ ] Test the full registration flow
- [ ] Clear localStorage (`localStorage.clear()` in console)
- [ ] Restart dev server fresh
- [ ] Have a few test entity URLs ready (even fake ones)
- [ ] Open demo-script-revised.md in second monitor

### During Demo:
- [ ] Use admin@oidfed.org / admin123 for login
- [ ] Have entity_id ready: `https://idp.example.edu`
- [ ] Don't click too fast - let animations play
- [ ] If asked about missing features, use: "That's in the backlog for next sprint"

### If Things Break:
- **Login fails**: Check localStorage, reload page
- **Entities don't show**: Check mock-db.ts has seed data
- **Registration errors**: Fall back to showing existing entities
- **Network tab shows errors**: Explain it's all client-side mocks

---

## Estimated Total Time for Priority 1 Fixes: ~1 hour

This leaves 2 days for rehearsal and polish!
