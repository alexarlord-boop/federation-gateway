# Trust Mark Correctness Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the trust-mark UI with the current API by adding spec-level additional claims, fixing subject status and claim handling, and correcting timing/refresh semantics.

**Architecture:** Keep the existing Trust Marks route structure and generated API client, and implement the work as a narrow frontend correctness pass across `TrustMarksPage`, `SelfTrustMarksTab`, and the trust-mark hooks. Add one focused reusable editor for array-based additional claims, wire it into issuance spec forms and subject panels, and cover the approved behavior with dedicated Playwright regressions.

**Tech Stack:** React, TypeScript, TanStack Query, shadcn/ui, Lucide React, Playwright

---

## File map

### Existing files to modify

- `src/pages/TrustMarksPage.tsx` — add spec-level additional-claims fields to the create/edit dialogs, show those claims in expanded specs, pass subject claim fallback data into the expanded panel, switch subject status to `inactive`, and surface backend error details.
- `src/components/trust-marks/SelfTrustMarksTab.tsx` — replace the overloaded `Expiry` column with a `Timing` presentation and correct the refresh helper copy.
- `src/hooks/useTrustMarkSubjectClaims.ts` — accept optional initial claims, preserve a reliable display source when the follow-up fetch is empty or delayed, and expose the query error to the page.
- `e2e/tests/trust-marks.spec.ts` — update the trust-mark smoke coverage so it asserts the new `Timing` label instead of the old `Expiry` wording.
- `e2e/tests/trust-marks-crud.spec.ts` — extend the existing CRUD flow so spec creation/editing covers shared additional claims.

### New files to create

- `src/components/trust-marks/AdditionalClaimsTableEditor.tsx` — reusable editor for array-based `additional_claims` used by issuance specs and subject claims.
- `e2e/tests/trust-marks-correctness.spec.ts` — focused regression suite for subject status payloads, subject-claims visibility/error details, and timing/refresh semantics.

---

### Task 1: Add spec-level additional-claims editing for issuance specs

**Files:**
- Create: `src/components/trust-marks/AdditionalClaimsTableEditor.tsx`
- Modify: `src/pages/TrustMarksPage.tsx`
- Modify: `e2e/tests/trust-marks-crud.spec.ts`

- [ ] **Step 1: Write the failing Playwright coverage for spec-level claims**

```ts
import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe.serial('Trust mark issuance spec claims @proxy', () => {
  const specType = `https://tm-spec-${Date.now()}.example.org`;

  test('create and edit dialogs expose shared additional claims', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    await page.getByRole('tab', { name: /issuance/i }).click();

    await page.getByRole('button', { name: /add spec/i }).click();
    await expect(page.getByRole('dialog', { name: /add issuance spec/i })).toBeVisible();
    await expect(page.getByText(/additional claims/i)).toBeVisible();

    await page.getByLabel(/trust mark type/i).fill(specType);
    await page.getByPlaceholder('claim_name').fill('loa');
    await page.getByPlaceholder(/string, number, or true\/false/i).fill('2');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText(specType)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /edit/i }).first().click();
    await expect(page.getByRole('dialog', { name: /edit issuance spec/i })).toBeVisible();
    await expect(page.getByText('loa')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the focused CRUD test to verify the current UI fails**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks-crud.spec.ts --project=full-stack`

Expected: FAIL because the Add/Edit Issuance Spec dialogs do not render any spec-level `Additional Claims` editor, so the new assertions cannot find that section.

- [ ] **Step 3: Create the reusable array-based claims editor component**

```tsx
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';

type EditableAdditionalClaim = AddAdditionalClaim & { id?: number };

export function AdditionalClaimsTableEditor({
  claims,
  onChange,
  disabled = false,
}: {
  claims: EditableAdditionalClaim[];
  onChange: (claims: EditableAdditionalClaim[]) => void;
  disabled?: boolean;
}) {
  const [claim, setClaim] = useState('');
  const [value, setValue] = useState('');
  const [crit, setCrit] = useState(false);

  const handleAdd = () => {
    if (!claim) return;
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    onChange([...claims, { claim, value: parsed, crit }]);
    setClaim('');
    setValue('');
    setCrit(false);
  };

  const handleRemove = (index: number) => {
    onChange(claims.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-2">
      {claims.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-16">Crit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((entry, index) => (
              <TableRow key={`${entry.claim ?? 'claim'}-${index}`}>
                <TableCell className="font-mono text-xs">{entry.claim}</TableCell>
                <TableCell className="font-mono text-xs break-all">{JSON.stringify(entry.value)}</TableCell>
                <TableCell className="text-xs">{entry.crit ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={disabled}
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex gap-2 items-center">
        <Input placeholder="claim_name" value={claim} onChange={(event) => setClaim(event.target.value)} />
        <Input placeholder="string, number, or true/false" value={value} onChange={(event) => setValue(event.target.value)} />
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={crit} onCheckedChange={setCrit} />
          <span className="text-xs">crit</span>
        </div>
        <Button type="button" size="sm" disabled={disabled || !claim} onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the new editor into the issuance-spec create and edit dialogs**

```tsx
import { AdditionalClaimsTableEditor } from '@/components/trust-marks/AdditionalClaimsTableEditor';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';

const [createForm, setCreateForm] = useState({
  trust_mark_type: '',
  description: '',
  lifetime: '',
  ref: '',
  logo_uri: '',
  delegation_jwt: '',
  additional_claims: [] as AddAdditionalClaim[],
});

const [editForm, setEditForm] = useState({
  description: '',
  lifetime: '',
  ref: '',
  logo_uri: '',
  delegation_jwt: '',
  additional_claims: [] as AddAdditionalClaim[],
});

if (createForm.additional_claims.length > 0) {
  payload.additional_claims = createForm.additional_claims as AddTrustMarkSpec['additional_claims'];
}

if (editForm.additional_claims.length > 0) {
  data.additional_claims = editForm.additional_claims as PatchTrustMarkSpec['additional_claims'];
}

<div className="space-y-2">
  <Label>Additional Claims</Label>
  <AdditionalClaimsTableEditor
    claims={createForm.additional_claims}
    onChange={(claims) => setCreateForm((current) => ({ ...current, additional_claims: claims }))}
    disabled={create.isPending}
  />
</div>

<div className="space-y-2">
  <Label>Additional Claims</Label>
  <AdditionalClaimsTableEditor
    claims={editForm.additional_claims}
    onChange={(claims) => setEditForm((current) => ({ ...current, additional_claims: claims }))}
    disabled={patch.isPending}
  />
</div>
```

- [ ] **Step 5: Surface spec descriptions and claims in the expanded issuance card**

```tsx
{expandedSpec === (spec.id as number) && (
  <CardContent className="pt-0 space-y-3">
    {spec.description && (
      <p className="text-sm text-muted-foreground">{spec.description}</p>
    )}

    {spec.additional_claims && spec.additional_claims.length > 0 && (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Shared Additional Claims</p>
        <AdditionalClaimsTableEditor
          claims={spec.additional_claims}
          onChange={() => {}}
          disabled
        />
      </div>
    )}

    <SpecSubjectsPanel specId={spec.id as number} />
  </CardContent>
)}
```

- [ ] **Step 6: Re-run the focused CRUD test to verify the spec-level flow passes**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks-crud.spec.ts --project=full-stack`

Expected: PASS with the issuance-spec dialog showing the shared additional-claims editor and the edited spec reopening with the claim row visible.

- [ ] **Step 7: Commit the issuance-spec claims pass**

```bash
git add src/components/trust-marks/AdditionalClaimsTableEditor.tsx src/pages/TrustMarksPage.tsx e2e/tests/trust-marks-crud.spec.ts
git commit -m "feat: add issuance spec claims editor"
```

---

### Task 2: Fix subject status, subject claims fallback, and backend error detail

**Files:**
- Modify: `src/pages/TrustMarksPage.tsx`
- Modify: `src/hooks/useTrustMarkSubjectClaims.ts`
- Create: `e2e/tests/trust-marks-correctness.spec.ts`

- [ ] **Step 1: Write the failing regression tests for subject payloads and error detail**

```ts
import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust mark subject correctness @proxy', () => {
  test('subject toggle sends inactive status', async ({ instancePage: page }) => {
    await page.route('**/api/v1/proxy/**/admin/trust-marks/issuance-spec/**/subjects/**/status', async (route) => {
      expect(route.request().method()).toBe('PUT');
      expect(route.request().postDataJSON()).toEqual({ status: 'inactive' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, entity_id: 'https://subject.example.org', status: 'inactive', additional_claims: [] }),
      });
    });

    await page.goto(`${APP_URL}/trust-marks`);
    await page.getByRole('tab', { name: /issuance/i }).click();
    await page.getByText(/subjects \(/i).first().click();
    await page.getByRole('switch').first().click();
  });

  test('claim mutation shows backend detail and keeps existing rows visible', async ({ instancePage: page }) => {
    await page.route('**/api/v1/proxy/**/admin/trust-marks/issuance-spec/**/subjects/**/additional-claims', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 7, claim: 'sector_id', value: 'research', crit: false }]),
        });
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'claim names must be unique' }),
      });
    });

    await page.goto(`${APP_URL}/trust-marks`);
    await page.getByRole('tab', { name: /issuance/i }).click();
    await page.getByRole('button', { name: /claims/i }).first().click();

    await expect(page.getByText('sector_id')).toBeVisible();
    await page.getByPlaceholder('claim_name').fill('sector_id');
    await page.getByPlaceholder(/"value" or true or 42/i).fill('"dup"');
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.getByText(/claim names must be unique/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the new correctness spec to verify the current UI fails**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks-correctness.spec.ts --project=full-stack`

Expected: FAIL because the current switch sends `{ status: "suspended" }`, and failed claim mutations only show `Failed to add claim` instead of the backend detail.

- [ ] **Step 3: Teach the subject-claims hook to expose a stable fallback view**

```tsx
import type { AdditionalClaims } from '@/client/models/AdditionalClaims';

export const useTrustMarkSubjectClaims = (
  specId: number,
  subjectId: number,
  initialClaims?: AdditionalClaims,
) => {
  // existing query setup omitted

  const visibleClaims = query.data ?? initialClaims ?? [];

  return {
    claims: visibleClaims,
    queryError: query.error,
    isLoading: query.isLoading,
    updateAll,
    get,
    update,
    remove,
  };
};
```

- [ ] **Step 4: Pass subject fallback claims into the expanded panel and switch the inactive payload**

```tsx
function SubjectClaimsPanel({
  specId,
  subjectId,
  initialClaims,
}: {
  specId: number;
  subjectId: number;
  initialClaims?: AdditionalClaims;
}) {
  const { claims, isLoading, queryError, updateAll, remove } =
    useTrustMarkSubjectClaims(specId, subjectId, initialClaims);

  if (queryError && (initialClaims?.length ?? 0) === 0) {
    return <p className="text-xs text-destructive">Claims could not be loaded.</p>;
  }

  // existing table rendering stays the same
}

<Switch
  checked={sub.status === 'active'}
  onCheckedChange={(checked) =>
    changeStatus.mutate({ subjectId: subId, status: checked ? 'active' : 'inactive' })
  }
/>
<span className="text-xs text-muted-foreground">{sub.status === 'active' ? 'Active' : 'Inactive'}</span>

<SubjectClaimsPanel
  specId={specId}
  subjectId={subId}
  initialClaims={sub.additional_claims}
/>
```

- [ ] **Step 5: Surface backend error detail for subject claim and subject-status failures**

```tsx
const getErrorDetail = (err: unknown, fallback: string) => {
  const candidate = err as { body?: { detail?: string; message?: string }; message?: string };
  return String(candidate.body?.detail ?? candidate.body?.message ?? candidate.message ?? fallback);
};

try {
  await updateAll.mutateAsync(next);
  toast({ title: 'Claim added' });
} catch (err) {
  toast({ variant: 'destructive', title: 'Error', description: getErrorDetail(err, 'Failed to add claim') });
}

changeStatus.mutate(
  { subjectId: subId, status: checked ? 'active' : 'inactive' },
  {
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: getErrorDetail(err, 'Failed to update subject status') });
    },
  },
);
```

- [ ] **Step 6: Re-run the correctness spec to verify the subject behavior passes**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks-correctness.spec.ts --project=full-stack`

Expected: PASS with the intercepted status request sending `inactive`, existing claims still visible in the expanded panel, and the backend `detail` string appearing in the toast.

- [ ] **Step 7: Commit the subject correctness pass**

```bash
git add src/pages/TrustMarksPage.tsx src/hooks/useTrustMarkSubjectClaims.ts e2e/tests/trust-marks-correctness.spec.ts
git commit -m "fix: align trust mark subject workflows"
```

---

### Task 3: Correct timing labels and refresh help text in self trust marks

**Files:**
- Modify: `src/components/trust-marks/SelfTrustMarksTab.tsx`
- Modify: `e2e/tests/trust-marks-correctness.spec.ts`
- Modify: `e2e/tests/trust-marks.spec.ts`

- [ ] **Step 1: Extend the correctness test with failing timing/refresh assertions**

```ts
test('self trust marks show timing semantics instead of a mixed expiry label', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/trust-marks`);
  await expect(page.getByRole('columnheader', { name: /timing/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /expiry/i })).toHaveCount(0);
});

test('refresh helper copy explains synchronous and asynchronous refresh thresholds', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/trust-marks`);
  await page.getByRole('button', { name: /add trust mark/i }).click();
  await page.getByRole('button', { name: /paste jwt/i }).click();
  await page.getByRole('switch').first().click();

  await expect(page.getByText(/synchronously refreshes once the remaining lifetime drops below the minimum/i)).toBeVisible();
  await expect(page.getByText(/returns the current token and refreshes in the background while still inside the grace period/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the correctness spec to verify the current copy fails**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks-correctness.spec.ts --project=full-stack`

Expected: FAIL because the table still uses `Expiry`, and the current help text says `Retry for this long after expiry` instead of describing the two refresh thresholds.

- [ ] **Step 3: Replace the overloaded column header with explicit timing text**

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Trust Mark Type</TableHead>
    <TableHead>Issuer</TableHead>
    <TableHead>Validity</TableHead>
    <TableHead>Timing</TableHead>
    <TableHead className="w-[130px]" />
  </TableRow>
</TableHeader>

<TableCell className="text-xs text-muted-foreground">
  {isSelfIssued
    ? (tm.self_issuance_spec?.lifetime ? `Lifetime: ${tm.self_issuance_spec.lifetime}s` : 'Lifetime: auto')
    : payload?.exp
      ? `Expires in: ${formatExpiryRelative(payload.exp)}`
      : tm.trust_mark ? 'Expires in: —' : <span className="italic">JWT pending</span>
  }
</TableCell>
```

- [ ] **Step 4: Rewrite the refresh helper text to match the approved semantics**

```tsx
<div className="space-y-1.5">
  <Label className="text-xs">Min Lifetime (s)</Label>
  <Input type="number" className="h-8 text-xs" placeholder="e.g. 3600" value={minLifetime} onChange={e => onChange({ minLifetime: e.target.value })} />
  <p className="text-[10px] text-muted-foreground">
    Synchronously refreshes once the remaining lifetime drops below this threshold.
  </p>
</div>
<div className="space-y-1.5">
  <Label className="text-xs">Grace Period (s)</Label>
  <Input type="number" className="h-8 text-xs" placeholder="e.g. 86400" value={graceP} onChange={e => onChange({ graceP: e.target.value })} />
  <p className="text-[10px] text-muted-foreground">
    Returns the current token and refreshes in the background while still inside this window.
  </p>
</div>
```

- [ ] **Step 5: Re-run the trust-mark smoke tests and the correctness spec**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/trust-marks.spec.ts tests/trust-marks-correctness.spec.ts --project=full-stack`

Expected: PASS with the new `Timing` header visible, the old `Expiry` header absent, and the refreshed helper copy matching the new assertions.

- [ ] **Step 6: Commit the timing/refresh pass**

```bash
git add src/components/trust-marks/SelfTrustMarksTab.tsx e2e/tests/trust-marks.spec.ts e2e/tests/trust-marks-correctness.spec.ts
git commit -m "fix: clarify trust mark timing semantics"
```

---

### Task 4: Run full validation and ship the trust-mark correctness slice

**Files:**
- Modify: `docs/superpowers/plans/2026-05-05-trust-mark-correctness-pass.md`

- [ ] **Step 1: Run the frontend lint pass**

Run: `cd /Users/alex.petrunin/federation-gateway && npm run lint`

Expected: PASS with no ESLint errors in the trust-mark files or new editor component.

- [ ] **Step 2: Run the frontend production build**

Run: `cd /Users/alex.petrunin/federation-gateway && npm run build`

Expected: PASS with a completed Vite build and generated assets under `dist/`.

- [ ] **Step 3: Run the full trust-mark Playwright slice**

Run: `cd /Users/alex.petrunin/federation-gateway/e2e && npm run test:full -- --grep "Trust Marks|trust mark"`

Expected: PASS with the existing trust-mark suites and the new correctness coverage all green.

- [ ] **Step 4: Update this plan file’s checkbox state during execution and commit the finished slice**

```bash
git add src/components/trust-marks/AdditionalClaimsTableEditor.tsx src/pages/TrustMarksPage.tsx src/hooks/useTrustMarkSubjectClaims.ts src/components/trust-marks/SelfTrustMarksTab.tsx e2e/tests/trust-marks.spec.ts e2e/tests/trust-marks-crud.spec.ts e2e/tests/trust-marks-correctness.spec.ts docs/superpowers/plans/2026-05-05-trust-mark-correctness-pass.md
git commit -m "fix: align trust mark workflows with api semantics"
```

---

## Self-review checklist

- **Spec coverage:** Task 1 covers spec-level additional claims and description visibility; Task 2 covers subject status, claim fallback, and backend detail; Task 3 covers timing and refresh semantics; Task 4 covers lint/build/test validation.
- **Placeholder scan:** No `TODO`, `TBD`, or “implement later” markers remain; every code-changing step includes an example snippet and every test step includes an exact command.
- **Type consistency:** The plan consistently uses `additional_claims`, `inactive`, `Timing`, `getErrorDetail`, and `useTrustMarkSubjectClaims(specId, subjectId, initialClaims)` across later tasks.
