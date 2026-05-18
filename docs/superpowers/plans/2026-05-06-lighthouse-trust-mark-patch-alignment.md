# LightHouse Trust Mark PATCH Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume the fixed LightHouse runtime and align the local trust-mark spec client/UI handling so issuance-spec `additional_claims` create, edit, and clear flows work end-to-end.

**Architecture:** Keep the trust-mark editor UX row-based in the frontend, but treat it as an adapter around the object-map API contract now enforced by the upstream spec and fixed LightHouse runtime. Pin the verified LightHouse image in local runtime config, correct the stale local client models for trust-mark specs, and update `TrustMarksPage` plus Playwright coverage so all edit paths send the full replacement object required by LightHouse.

**Tech Stack:** Docker Compose, LightHouse (`oidfed/lighthouse`), React, TypeScript, openapi-typescript-codegen output, TanStack Query, shadcn/ui, Playwright

---

## File map

### Existing files to modify

- `docker-compose.yml` — replace the stale `oidfed/lighthouse:0.20.0` image reference with the verified fixed image digest.
- `README.md` — update the LightHouse version note in the services table so local runtime docs match the compose stack.
- `src/client/models/TrustMarkSpec.ts` — change `additional_claims` to the object-map trust-mark spec contract.
- `src/client/models/AddTrustMarkSpec.ts` — change create payload typing to the object-map trust-mark spec contract.
- `src/client/models/PatchTrustMarkSpec.ts` — change patch payload typing to the object-map trust-mark spec contract.
- `src/pages/TrustMarksPage.tsx` — keep row editing in the dialogs, but map rows to the full object payload for create/edit/clear and map object responses back into rows for display and editing.
- `e2e/tests/trust-marks-crud.spec.ts` — verify create/edit/clear persistence against the fixed LightHouse runtime.

### New files to create

- `src/client/models/TrustMarkSpecAdditionalClaims.ts` — shared `Record<string, unknown>` alias for issuance-spec `additional_claims` so the three trust-mark spec models stay consistent.

---

### Task 1: Pin the verified LightHouse runtime in local stack config

**Files:**
- Modify: `docker-compose.yml`
- Modify: `README.md`

- [ ] **Step 1: Write the failing runtime verification command against the current stack**

```bash
TOKEN=$(curl -sS -X POST http://localhost:8765/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oidfed.org","password":"admin123"}' | jq -r '.access_token')

SPEC_JSON=$(curl -sS -X POST \
  http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "trust_mark_type":"https://plan-runtime-check.example.org",
    "additional_claims":{"org_name":"Plan Org","level":"standard"}
  }')

SPEC_ID=$(printf '%s' "$SPEC_JSON" | jq -r '.id')

curl -sS -X PATCH \
  "http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec/$SPEC_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"additional_claims":{"org_name":"Plan Org Updated","level":"gold"}}'
```

- [ ] **Step 2: Run the verification command to confirm the pre-fix image still fails**

Run: the command block from Step 1

Expected: response contains `server_error` or HTTP 500 when `additional_claims` is patched while scalar-only patches still succeed.

- [ ] **Step 3: Update `docker-compose.yml` to the verified fixed LightHouse image**

```yaml
lighthouse:
  image: oidfed/lighthouse@sha256:e7fe82e7d347a6f279b81639d0444c60fa47f01aca82b27590541dfa9edec6be
  restart: unless-stopped
  entrypoint:
    - /bin/sh
    - -c
    - mkdir -p /data/keys && chmod 0777 /data /data/keys && exec /entrypoint.sh
```

- [ ] **Step 4: Update the README service note to match the pinned verified image**

```md
| **LightHouse** | `8081` (configurable via `LIGHTHOUSE_PUBLIC_PORT`) | Verified digest `oidfed/lighthouse@sha256:e7fe82e7d347a6f279b81639d0444c60fa47f01aca82b27590541dfa9edec6be` |
```

- [ ] **Step 5: Restart the LightHouse service and rerun the verification command**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass
docker compose up -d lighthouse
```

Then rerun the command block from Step 1.

Expected: create returns 201, patching `description` returns 200, patching object-form `additional_claims` returns 200, and patching `{}` later will clear the field.

- [ ] **Step 6: Commit the runtime-alignment change**

```bash
git add docker-compose.yml README.md
git commit -m "chore: pin fixed lighthouse image"
```

---

### Task 2: Correct the stale local trust-mark spec client models

**Files:**
- Create: `src/client/models/TrustMarkSpecAdditionalClaims.ts`
- Modify: `src/client/models/TrustMarkSpec.ts`
- Modify: `src/client/models/AddTrustMarkSpec.ts`
- Modify: `src/client/models/PatchTrustMarkSpec.ts`

- [ ] **Step 1: Write a failing type-check proof that the current models are wrong**

```ts
// temporary scratch snippet for validation
import type { AddTrustMarkSpec } from '@/client/models/AddTrustMarkSpec';

const payload: AddTrustMarkSpec = {
  trust_mark_type: 'https://type.example.org',
  additional_claims: {
    org_name: 'Plan Org',
    level: 'standard',
  },
};
```

- [ ] **Step 2: Run TypeScript to verify the current stale models reject the object-map contract**

Run: `cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npx tsc --noEmit`

Expected: type errors show `additional_claims` expects `AdditionalClaims` rows instead of an object map.

- [ ] **Step 3: Create a shared trust-mark spec claims alias**

```ts
export type TrustMarkSpecAdditionalClaims = Record<string, unknown>;
```

- [ ] **Step 4: Update the three trust-mark spec models to use the shared object-map alias**

```ts
import type { TrustMarkSpecAdditionalClaims } from './TrustMarkSpecAdditionalClaims';

export type TrustMarkSpec = {
  readonly id: InternalID;
  trust_mark_type: string;
  description?: string;
  lifetime?: number;
  ref?: string;
  logo_uri?: string;
  delegation_jwt?: string;
  additional_claims?: TrustMarkSpecAdditionalClaims;
};
```

```ts
import type { TrustMarkSpecAdditionalClaims } from './TrustMarkSpecAdditionalClaims';

export type AddTrustMarkSpec = {
  trust_mark_type: string;
  lifetime?: number;
  ref?: string;
  logo_uri?: string;
  delegation_jwt?: string;
  additional_claims?: TrustMarkSpecAdditionalClaims;
};
```

```ts
import type { TrustMarkSpecAdditionalClaims } from './TrustMarkSpecAdditionalClaims';

export type PatchTrustMarkSpec = {
  trust_mark_type?: string;
  lifetime?: number;
  ref?: string;
  logo_uri?: string;
  delegation_jwt?: string;
  additional_claims?: TrustMarkSpecAdditionalClaims;
};
```

- [ ] **Step 5: Re-run TypeScript to confirm the local client contract now matches the spec**

Run: `cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npx tsc --noEmit`

Expected: the trust-mark spec payload shape no longer produces `additional_claims` type errors.

- [ ] **Step 6: Commit the client-model alignment**

```bash
git add src/client/models/TrustMarkSpecAdditionalClaims.ts src/client/models/TrustMarkSpec.ts src/client/models/AddTrustMarkSpec.ts src/client/models/PatchTrustMarkSpec.ts
git commit -m "fix: align trust mark spec client models"
```

---

### Task 3: Finish the TrustMarksPage adapter for full-object create, edit, and clear

**Files:**
- Modify: `src/pages/TrustMarksPage.tsx`
- Modify: `e2e/tests/trust-marks-crud.spec.ts`

- [ ] **Step 1: Extend the Playwright spec so it fails until full-object persistence works**

```ts
test('can create issuance spec with shared additional claim', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/trust-marks`);
  await page.getByRole('tab', { name: /issuance/i }).click();
  await page.getByRole('button', { name: /add spec/i }).click();

  const dialog = page.getByRole('dialog', { name: /add issuance spec/i });
  await dialog.getByLabel(/trust mark type/i).fill(specType);
  await dialog.getByPlaceholder('claim_name').fill('org_name');
  await dialog.getByPlaceholder(/string, number, or true\/false/i).fill('"Plan Org"');
  await dialog.getByRole('button', { name: /^add$/i }).last().click();
  await dialog.getByRole('button', { name: /^create$/i }).click();
  await expect(dialog).not.toBeVisible();

  const specCard = page.locator(`text=${specType}`).locator('..').locator('..').locator('..');
  await specCard.locator('button:has(svg)').first().click();

  const editDialog = page.getByRole('dialog', { name: /edit issuance spec/i });
  await expect(editDialog.getByText('org_name')).toBeVisible();
  await expect(editDialog.getByText('"Plan Org"')).toBeVisible();
});
```

- [ ] **Step 2: Run the focused trust-mark CRUD spec to confirm the current adapter still fails**

Run: `cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass/e2e && npx playwright test tests/trust-marks-crud.spec.ts --project=full-stack`

Expected: FAIL because `TrustMarksPage.tsx` still treats `additional_claims` as array rows or omits the empty-object clear path.

- [ ] **Step 3: Add explicit object-row conversion helpers in `TrustMarksPage.tsx`**

```tsx
type ClaimRow = { claim: string; value: unknown; crit?: boolean };

const claimsObjectToRows = (claims?: Record<string, unknown>): ClaimRow[] =>
  claims ? Object.entries(claims).map(([claim, value]) => ({ claim, value, crit: false })) : [];

const claimRowsToObject = (rows: ClaimRow[]): Record<string, unknown> =>
  Object.fromEntries(rows.map((row) => [row.claim, row.value]));
```

- [ ] **Step 4: Wire create/edit/clear payloads to the full replacement object semantics**

```tsx
const [createClaims, setCreateClaims] = useState<ClaimRow[]>([]);
const [editClaims, setEditClaims] = useState<ClaimRow[]>([]);

if (createClaims.length > 0) {
  payload.additional_claims = claimRowsToObject(createClaims);
}

data.additional_claims = claimRowsToObject(editClaims);

setEditClaims(claimsObjectToRows(spec.additional_claims));

<AdditionalClaimsTableEditor
  claims={createClaims}
  onChange={setCreateClaims}
  disabled={create.isPending}
/>
```

- [ ] **Step 5: Render shared claims in expanded cards using the object-map adapter**

```tsx
{spec.additional_claims && Object.keys(spec.additional_claims).length > 0 && (
  <div className="space-y-2 rounded-md border p-3">
    <p className="text-sm font-medium">Shared Additional Claims</p>
    <AdditionalClaimsTableEditor
      claims={claimsObjectToRows(spec.additional_claims)}
      onChange={() => {}}
      disabled
    />
  </div>
)}
```

- [ ] **Step 6: Re-run the focused trust-mark CRUD spec and the build**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass/e2e && npx playwright test tests/trust-marks-crud.spec.ts --project=full-stack
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npm run build
```

Expected: CRUD spec passes for create/edit/clear persistence, and the Vite build succeeds with the new client/model shape.

- [ ] **Step 7: Commit the trust-mark adapter fix**

```bash
git add src/pages/TrustMarksPage.tsx e2e/tests/trust-marks-crud.spec.ts
git commit -m "fix: align trust mark spec claims handling"
```

---

### Task 4: Run full verification and ship the aligned trust-mark flow

**Files:**
- Modify: `docs/superpowers/plans/2026-05-06-lighthouse-trust-mark-patch-alignment.md`

- [ ] **Step 1: Re-run the direct API verification against the updated compose stack**

```bash
TOKEN=$(curl -sS -X POST http://localhost:8765/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oidfed.org","password":"admin123"}' | jq -r '.access_token')

SPEC_JSON=$(curl -sS -X POST \
  http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "trust_mark_type":"https://plan-final-check.example.org",
    "additional_claims":{"org_name":"Final Org","level":"standard"}
  }')

SPEC_ID=$(printf '%s' "$SPEC_JSON" | jq -r '.id')

curl -sS -X PATCH \
  "http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec/$SPEC_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"additional_claims":{"org_name":"Final Org Updated","level":"gold"}}'

curl -sS -X PATCH \
  "http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec/$SPEC_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"additional_claims":{}}'
```

- [ ] **Step 2: Run lint, type-check, build, and the trust-mark Playwright slice**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npm run lint
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npx tsc --noEmit
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass && npm run build
cd /Users/alex.petrunin/federation-gateway/.worktrees/trust-mark-correctness-pass/e2e && npm run test:full -- tests/trust-marks-crud.spec.ts tests/trust-marks.spec.ts
```

Expected: all commands pass; trust-mark issuance-spec CRUD no longer fails on create/edit/clear of `additional_claims`.

- [ ] **Step 3: Update this plan file’s checkboxes during execution and create the final feature commit**

```bash
git add docker-compose.yml README.md src/client/models/TrustMarkSpecAdditionalClaims.ts src/client/models/TrustMarkSpec.ts src/client/models/AddTrustMarkSpec.ts src/client/models/PatchTrustMarkSpec.ts src/pages/TrustMarksPage.tsx e2e/tests/trust-marks-crud.spec.ts docs/superpowers/plans/2026-05-06-lighthouse-trust-mark-patch-alignment.md
git commit -m "fix: align trust mark spec patch flow"
```

---

## Self-review checklist

- **Spec coverage:** Task 1 covers the fixed runtime image; Task 2 covers local client-model drift; Task 3 covers the UI adapter and persistence semantics; Task 4 covers direct API, gateway, and UI verification.
- **Placeholder scan:** No `TODO`, `TBD`, or vague “handle later” steps remain; every code-changing step includes exact snippets and every validation step includes exact commands.
- **Type consistency:** The plan consistently uses `TrustMarkSpecAdditionalClaims`, `Record<string, unknown>`, `claimsObjectToRows`, `claimRowsToObject`, and full-object replacement semantics for `additional_claims`.
