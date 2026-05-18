# UI Terminology and Navigation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace outdated user-facing federation wording with the approved “Subordinates” and “Authority Hint” terminology, and move intermediate registration discovery into the subordinate navigation flow without changing the underlying routes or data model.

**Architecture:** Keep `/entities` and `/trust-anchors` as the existing route and API boundaries, but update the visible navigation, page copy, and trust-anchor page actions so the UI matches the approved product language. Implement this as a presentation-layer pass across the sidebar, subordinate pages, trust-anchor page, and Playwright coverage, with no backend schema or route rewrites.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, shadcn/ui, Lucide React, Playwright

---

## File map

### Existing files to modify

- `src/components/layout/AppSidebar.tsx` — rename the sidebar section from **Leaf Entities** to **Subordinates**, rename child items, and add the intermediate registration entry under the subordinate menu.
- `src/pages/EntitiesPage.tsx` — rename headings, descriptions, empty states, button copy, and list empty-state text for the subordinate list view.
- `src/pages/EntityRegisterPage.tsx` — rename the registration flow copy for subordinate language and make the `type=intermediate` mode explicitly read as an intermediate-under-subordinates flow.
- `src/pages/EntityDetailPage.tsx` — rename back-navigation and delete success/error copy so detail pages match the subordinate terminology.
- `src/pages/TrustAnchorsPage.tsx` — standardize upstream wording around **Authority Hint**, remove the trust-anchor page as the primary intermediate registration entry point, and align helper/empty-state copy.
- `src/pages/RBACManagementPage.tsx` — update the feature-to-UI map strings so admin documentation reflects the new labels.
- `e2e/tests/entities.spec.ts` — update existing subordinate-page expectations and add checks for the renamed registration flow copy.
- `e2e/tests/trust-anchors.spec.ts` — update trust-anchor page expectations for authority-hint wording and the revised intermediate section behavior.

### New files to create

- `e2e/tests/navigation-labels.spec.ts` — focused regression coverage for sidebar labels and the new subordinate navigation entry for intermediate registration.

---

### Task 1: Rename sidebar and admin-facing navigation labels

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/pages/RBACManagementPage.tsx`
- Create: `e2e/tests/navigation-labels.spec.ts`

- [ ] **Step 1: Write the failing navigation-label Playwright test**

```ts
import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Navigation labels @proxy', () => {
  test('sidebar shows subordinate terminology and intermediate registration entry', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);

    await expect(page.getByRole('link', { name: /subordinates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /all subordinates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register subordinate/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register intermediate/i })).toBeVisible();
    await expect(page.getByText(/leaf entities/i)).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the new focused Playwright test to confirm the current UI still fails**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/navigation-labels.spec.ts`

Expected: FAIL because the sidebar still renders **Leaf Entities**, **All Entities**, and **Register New**, and there is no subordinate menu item for **Register Intermediate**.

- [ ] **Step 3: Update the sidebar labels, open-state key, and query-aware active matching**

```tsx
const isCurrentNavTarget = (href: string) => {
  const [pathname, search = ''] = href.split('?');
  return location.pathname === pathname && location.search === (search ? `?${search}` : '');
};

const sidebarSections: SidebarSection[] = [
  {
    label: 'Federation',
    items: [
      {
        title: 'Subordinates',
        href: '/entities',
        icon: Leaf,
        feature: 'subordinates',
        children: [
          { title: 'All Subordinates', href: '/entities', feature: 'subordinates', operation: 'list' },
          { title: 'Register Subordinate', href: '/entities/register', feature: 'subordinates', operation: 'create' },
          { title: 'Register Intermediate', href: '/entities/register?type=intermediate', feature: 'subordinates', operation: 'create' },
        ],
      },
    ],
  },
];

const [openSections, setOpenSections] = useState<string[]>(['Subordinates']);

const isActive = hasChildren
  ? visibleChildren?.some((child) => isCurrentNavTarget(child.href)) || isCurrentNavTarget(item.href)
  : isCurrentNavTarget(item.href) || location.pathname.startsWith(item.href + '/');
```

- [ ] **Step 4: Update the RBAC feature map strings to match the new visible labels**

```tsx
const FEATURE_UI_MAP: Record<string, FeatureUIMapping> = {
  subordinates: {
    description: 'Subordinate management: registration, approval, and detail views',
    sidebar: ['Subordinates', 'All Subordinates', 'Register Subordinate', 'Register Intermediate', 'Approvals'],
    pages: ['/entities', '/entities/register', '/entities/:id', '/approvals'],
  },
  trust_anchors: {
    description: 'Trust anchor and authority-hint management',
    sidebar: ['TAs and IAs'],
    pages: ['/trust-anchors'],
  },
};
```

- [ ] **Step 5: Re-run the focused Playwright navigation test**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/navigation-labels.spec.ts`

Expected: PASS with 1 test passed.

- [ ] **Step 6: Commit the navigation-label pass**

```bash
git add src/components/layout/AppSidebar.tsx src/pages/RBACManagementPage.tsx e2e/tests/navigation-labels.spec.ts
git commit -m "feat: rename subordinate navigation labels"
```

---

### Task 2: Update subordinate list, registration, and detail page copy

**Files:**
- Modify: `src/pages/EntitiesPage.tsx`
- Modify: `src/pages/EntityRegisterPage.tsx`
- Modify: `src/pages/EntityDetailPage.tsx`
- Modify: `e2e/tests/entities.spec.ts`

- [ ] **Step 1: Update the existing entities Playwright expectations to the new copy**

```ts
test('subordinates list is visible with correct heading', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/entities`);
  await expect(page).toHaveURL(/\/entities$/);
  await expect(page.getByRole('heading', { level: 1, name: /subordinates/i })).toBeVisible();
  await expect(page.getByText(/manage registered subordinates in the federation/i)).toBeVisible();
});

test('can navigate to register subordinate form', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/entities`);
  await page.getByRole('link', { name: /register subordinate/i }).click();
  await expect(page).toHaveURL(/\/entities\/register/);
  await expect(page.getByRole('heading', { name: /register subordinate/i })).toBeVisible();
});

test('intermediate registration uses subordinate wording', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/entities/register?type=intermediate`);
  await expect(page.getByRole('heading', { name: /register intermediate/i })).toBeVisible();
  await expect(page.getByText(/register an intermediate subordinate in the federation/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the focused entities Playwright suite to confirm the copy has not been updated yet**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/entities.spec.ts`

Expected: FAIL on the old heading/button expectations because the UI still says **Leaf Entities**, **Register Entity**, and **Register New Entity**.

- [ ] **Step 3: Rename the list-page copy in `EntitiesPage.tsx`**

```tsx
if (!activeTrustAnchor) {
  return (
    <div className="text-center py-12">
      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
      <p className="text-muted-foreground">
        Choose a federation instance from the sidebar to view subordinates.
      </p>
    </div>
  );
}

<h1 className="page-title">Subordinates</h1>
<p className="page-description">Manage registered subordinates in the federation</p>

<Button asChild>
  <Link to="/entities/register">
    <Plus className="w-4 h-4 mr-2" />
    Register Subordinate
  </Link>
</Button>
```

- [ ] **Step 4: Make `EntityRegisterPage.tsx` explicitly subordinate-oriented, with intermediate-specific copy when `type=intermediate`**

```tsx
const isIntermediate = searchParams.get('type') === 'intermediate';
const pageTitle = isIntermediate ? 'Register Intermediate' : 'Register Subordinate';
const pageDescription = isIntermediate
  ? 'Register an intermediate subordinate in the federation. The entity configuration will be fetched automatically from the entity well-known endpoint.'
  : 'Register a new subordinate in the federation. The entity configuration will be fetched automatically from the entity well-known endpoint.';

<Link to="/entities" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
  <ArrowLeft className="w-4 h-4 mr-1" />
  Back to Subordinates
</Link>

<CardTitle>{pageTitle}</CardTitle>
<CardDescription>{pageDescription}</CardDescription>
```

- [ ] **Step 5: Align `EntityDetailPage.tsx` detail-view copy with the subordinate terminology**

```tsx
toast({ title: 'Subordinate Deleted', description: 'The subordinate has been removed.' });
toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete subordinate' });

<Button asChild>
  <Link to="/entities">Back to Subordinates</Link>
</Button>
```

- [ ] **Step 6: Re-run the focused entities Playwright suite**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/entities.spec.ts`

Expected: PASS with the subordinate list, subordinate registration, and intermediate registration copy assertions all green.

- [ ] **Step 7: Commit the subordinate copy pass**

```bash
git add src/pages/EntitiesPage.tsx src/pages/EntityRegisterPage.tsx src/pages/EntityDetailPage.tsx e2e/tests/entities.spec.ts
git commit -m "feat: rename entity flows to subordinates"
```

---

### Task 3: Standardize authority-hint language and demote trust-anchor ownership of intermediate registration

**Files:**
- Modify: `src/pages/TrustAnchorsPage.tsx`
- Modify: `e2e/tests/trust-anchors.spec.ts`

- [ ] **Step 1: Update the trust-anchor Playwright assertions to the new wording**

```ts
test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/trust-anchors`);
  await expect(page).toHaveURL(/\/trust-anchors/);
  await expect(page.getByRole('button', { name: /add authority hint/i })).toBeVisible();
});

test('authority hint dialog uses consistent wording', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/trust-anchors`);
  await page.getByRole('button', { name: /add authority hint/i }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/link authority hint/i)).toBeVisible();
  await expect(page.getByLabel(/authority hint entity id/i)).toBeVisible();
  await expect(page.getByText(/superior ta/i)).toHaveCount(0);
});
```

- [ ] **Step 2: Run the trust-anchor Playwright suite to confirm the current wording is still inconsistent**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-anchors.spec.ts`

Expected: FAIL because the page still shows **Add Superior TA**, **Link Superior Trust Anchor**, and other mixed superior-TA wording.

- [ ] **Step 3: Rename the authority-hint button, dialog, toasts, labels, and empty-state helper text**

```tsx
toast({ title: 'Authority Hint Added', description: 'Authority hint configured successfully.' });

<DialogTrigger asChild>
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    Add Authority Hint
  </Button>
</DialogTrigger>

<DialogTitle>Link Authority Hint</DialogTitle>
<DialogDescription>
  Add an upstream federation via an authority hint. This configures which upstream authorities this instance trusts.
</DialogDescription>

<Label htmlFor="entity-id">Authority Hint Entity ID</Label>
```

- [ ] **Step 4: Remove the trust-anchor page as the primary intermediate-registration entry point while keeping visibility of existing intermediates**

```tsx
<section>
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <ArrowDownToLine className="w-5 h-5 text-primary" />
      <h2 className="text-lg font-semibold">Registered Intermediates</h2>
      <span className="text-sm text-muted-foreground">(Managed as subordinates)</span>
    </div>
  </div>

  <Card className="bg-muted/30">
    <CardContent className="py-8 text-center text-muted-foreground">
      <p className="text-sm">Register new intermediates from the Subordinates navigation.</p>
    </CardContent>
  </Card>
</section>
```

- [ ] **Step 5: Re-run the trust-anchor Playwright suite**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-anchors.spec.ts`

Expected: PASS with the updated authority-hint dialog copy and trust-anchor page behavior.

- [ ] **Step 6: Commit the trust-anchor terminology pass**

```bash
git add src/pages/TrustAnchorsPage.tsx e2e/tests/trust-anchors.spec.ts
git commit -m "feat: standardize authority hint terminology"
```

---

### Task 4: Run the full UI regression set for terminology and navigation

**Files:**
- Test: `e2e/tests/navigation-labels.spec.ts`
- Test: `e2e/tests/entities.spec.ts`
- Test: `e2e/tests/trust-anchors.spec.ts`
- Test: `e2e/tests/instance-selection.spec.ts`
- Test: `e2e/tests/rbac-enforcement.spec.ts`

- [ ] **Step 1: Run the targeted frontend build**

Run: `cd /Users/alex.petrunin/federation-gateway && npm run build`

Expected: PASS with a production build completing successfully.

- [ ] **Step 2: Run the terminology/navigation Playwright regression set**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/navigation-labels.spec.ts tests/entities.spec.ts tests/trust-anchors.spec.ts tests/instance-selection.spec.ts tests/rbac-enforcement.spec.ts`

Expected: PASS with the renamed navigation, subordinate copy, authority-hint copy, and instance-selection flows all green.

- [ ] **Step 3: Review the diff for accidental route or model changes**

```bash
git --no-pager diff -- src/components/layout/AppSidebar.tsx src/pages/EntitiesPage.tsx src/pages/EntityRegisterPage.tsx src/pages/EntityDetailPage.tsx src/pages/TrustAnchorsPage.tsx src/pages/RBACManagementPage.tsx e2e/tests/navigation-labels.spec.ts e2e/tests/entities.spec.ts e2e/tests/trust-anchors.spec.ts
```

Expected: Only user-facing copy, navigation-item wiring, and Playwright assertions changed; no backend files or route declarations changed.

- [ ] **Step 4: Commit the verified final polish**

```bash
git add src/components/layout/AppSidebar.tsx src/pages/EntitiesPage.tsx src/pages/EntityRegisterPage.tsx src/pages/EntityDetailPage.tsx src/pages/TrustAnchorsPage.tsx src/pages/RBACManagementPage.tsx e2e/tests/navigation-labels.spec.ts e2e/tests/entities.spec.ts e2e/tests/trust-anchors.spec.ts
git commit -m "test: verify UI terminology cleanup regressions"
```

---

## Self-review checklist

- **Spec coverage:** this plan covers sidebar labels, subordinate page copy, authority-hint wording, intermediate entry-point relocation, RBAC/admin label alignment, and Playwright regression coverage from the approved spec.
- **Placeholder scan:** no `TODO`, `TBD`, “similar to Task N”, or empty “write tests” placeholders remain; every task lists concrete files, commands, and code snippets.
- **Type consistency:** the plan keeps the existing `/entities` and `/trust-anchors` routes, uses the current `type=intermediate` query parameter, adds query-aware nav matching for the new sidebar child, and consistently refers to the user-facing terms **Subordinates** and **Authority Hint**.
