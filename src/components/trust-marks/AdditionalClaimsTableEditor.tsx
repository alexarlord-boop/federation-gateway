/**
 * AdditionalClaimsTableEditor
 *
 * Reusable row-based editor for issuance-spec shared additional_claims.
 * The API contract uses TrustMarkSpecAdditionalClaims = Record<string, unknown>,
 * so this component converts between rows (claim/value/crit UI) and the flat
 * object contract required by AddTrustMarkSpec / PatchTrustMarkSpec.
 *
 * The `crit` column is kept for UI parity with per-subject claims but is not
 * included in the Record output (spec claims have no separate crit semantics).
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { TrustMarkSpecAdditionalClaims } from '@/types/api-shims';

// ── Internal row type ─────────────────────────────────────

interface ClaimRow {
  claim: string;
  value: string;
  crit: boolean;
}

// ── Conversion helpers ────────────────────────────────────

function toRows(claims: TrustMarkSpecAdditionalClaims): ClaimRow[] {
  return Object.entries(claims).map(([claim, value]) => ({
    claim,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    crit: false,
  }));
}

function fromRows(rows: ClaimRow[]): TrustMarkSpecAdditionalClaims {
  return Object.fromEntries(
    rows.map((r) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(r.value);
      } catch {
        parsed = r.value;
      }
      return [r.claim, parsed];
    }),
  );
}

// ── Component ─────────────────────────────────────────────

interface AdditionalClaimsTableEditorProps {
  /** Current spec additional_claims object from the API. */
  claims: TrustMarkSpecAdditionalClaims;
  /** Called with the updated object every time claims change. */
  onChange: (claims: TrustMarkSpecAdditionalClaims) => void;
}

export function AdditionalClaimsTableEditor({
  claims,
  onChange,
}: AdditionalClaimsTableEditorProps) {
  const rows = toRows(claims);

  const [newClaim, setNewClaim] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCrit, setNewCrit] = useState(false);

  const commit = (next: ClaimRow[]) => onChange(fromRows(next));

  const handleAdd = () => {
    if (!newClaim) return;
    commit([...rows, { claim: newClaim, value: newValue, crit: newCrit }]);
    setNewClaim('');
    setNewValue('');
    setNewCrit(false);
  };

  const handleRemove = (index: number) => {
    commit(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1 h-7 text-xs">Claim</TableHead>
              <TableHead className="py-1 h-7 text-xs">Value</TableHead>
              <TableHead className="py-1 h-7 w-12 text-xs">Crit</TableHead>
              <TableHead className="py-1 h-7 w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.claim}-${i}`}>
                <TableCell className="py-1 font-mono text-xs">{row.claim}</TableCell>
                <TableCell className="py-1 font-mono text-xs break-all max-w-[160px]">
                  {row.value}
                </TableCell>
                <TableCell className="py-1 text-xs">{row.crit ? 'Yes' : '—'}</TableCell>
                <TableCell className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemove(i)}
                    aria-label={`Remove claim ${row.claim}`}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add-row form */}
      <div className="flex gap-1.5 items-center">
        <Input
          className="h-7 text-xs flex-1 min-w-0"
          placeholder="claim_name"
          value={newClaim}
          onChange={(e) => setNewClaim(e.target.value)}
          aria-label="New claim name"
        />
        <Input
          className="h-7 text-xs flex-1 min-w-0"
          placeholder='"string", number, or true/false'
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          aria-label="New claim value"
        />
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={newCrit}
            onCheckedChange={setNewCrit}
            aria-label="Mark claim as critical"
          />
          <span className="text-xs text-muted-foreground">crit</span>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs px-2 shrink-0"
          onClick={handleAdd}
          disabled={!newClaim}
          aria-label="Add claim"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
