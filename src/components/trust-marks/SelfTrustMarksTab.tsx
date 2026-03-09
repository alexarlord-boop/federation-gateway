import { useState } from 'react';
import { Award, Edit2, Eye, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useEntityConfigTrustMarks } from '@/hooks/useEntityConfigTrustMarks';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';
import {
  decodeTrustMarkJwt, formatExpiryRelative, getTrustMarkValidity,
} from '@/lib/jwt-utils';
import { ValidityBadge } from './ValidityBadge';
import { JwtDetailDialog } from './JwtDetailDialog';
import type { TrustMark } from '@/client/models/TrustMark';
import type { SelfIssuedTrustMarkSpec } from '@/client/models/SelfIssuedTrustMarkSpec';

type AddMode = 'jwt' | 'manual' | 'self';

// ── Key-Value editor for self-issuance additional_claims ──

function AdditionalClaimsEditor({
  claims,
  onChange,
}: {
  claims: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const handleAdd = () => {
    if (!key) return;
    let parsed: unknown;
    try { parsed = JSON.parse(val); } catch { parsed = val; }
    onChange({ ...claims, [key]: parsed });
    setKey(''); setVal('');
  };

  const handleRemove = (k: string) => {
    const next = { ...claims };
    delete next[k];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {Object.entries(claims).length > 0 && (
        <div className="space-y-1">
          {Object.entries(claims).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs">
              <span className="font-mono font-medium flex-1">{k}</span>
              <span className="font-mono text-muted-foreground max-w-[140px] truncate">{JSON.stringify(v)}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemove(k)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input className="h-7 text-xs" placeholder="claim_name" value={key} onChange={e => setKey(e.target.value)} />
        <Input className="h-7 text-xs flex-1" placeholder='"value" or true or 42' value={val} onChange={e => setVal(e.target.value)} />
        <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd} disabled={!key}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Refresh settings fields ──

function RefreshFields({
  refresh, minLifetime, graceP, rateLimit, onChange,
}: {
  refresh: boolean; minLifetime: string; graceP: string; rateLimit: string;
  onChange: (f: { refresh?: boolean; minLifetime?: string; graceP?: string; rateLimit?: string }) => void;
}) {
  return (
    <div className="space-y-3 pt-1 border-t">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Automatic Refresh</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Automatically re-fetch this trust mark before it expires.</p>
        </div>
        <Switch checked={refresh} onCheckedChange={v => onChange({ refresh: v })} />
      </div>
      {refresh && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Lifetime (s)</Label>
            <Input type="number" className="h-8 text-xs" placeholder="e.g. 3600" value={minLifetime} onChange={e => onChange({ minLifetime: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Trigger refresh when this many seconds remain.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Grace Period (s)</Label>
            <Input type="number" className="h-8 text-xs" placeholder="e.g. 86400" value={graceP} onChange={e => onChange({ graceP: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Retry for this long after expiry.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rate Limit (s)</Label>
            <Input type="number" className="h-8 text-xs" placeholder="e.g. 300" value={rateLimit} onChange={e => onChange({ rateLimit: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Min seconds between attempts.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export function SelfTrustMarksTab() {
  const { trustMarks, isLoading, error, create, patch, remove } = useEntityConfigTrustMarks();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('entity_configuration_trust_marks', 'create');
  const canDelete = useOperationAllowed('entity_configuration_trust_marks', 'delete');
  const canUpdate = useOperationAllowed('entity_configuration_trust_marks', 'update');

  // Add dialog
  const [addMode, setAddMode] = useState<AddMode>('jwt');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [jwtInput, setJwtInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [issuerInput, setIssuerInput] = useState('');
  const [selfType, setSelfType] = useState('');
  const [selfLifetime, setSelfLifetime] = useState('');
  const [selfRef, setSelfRef] = useState('');
  const [selfLogoUri, setSelfLogoUri] = useState('');
  const [selfClaims, setSelfClaims] = useState<Record<string, unknown>>({});
  const [selfIncludeExtra, setSelfIncludeExtra] = useState(false);
  const [refreshEnabled, setRefreshEnabled] = useState(false);
  const [refreshMinLifetime, setRefreshMinLifetime] = useState('');
  const [refreshGraceP, setRefreshGraceP] = useState('');
  const [refreshRateLimit, setRefreshRateLimit] = useState('');

  // View / edit
  const [viewJwt, setViewJwt] = useState<string | null>(null);
  const [editingTm, setEditingTm] = useState<TrustMark | null>(null);
  const [editIssuer, setEditIssuer] = useState('');
  const [editJwt, setEditJwt] = useState('');
  const [editRefresh, setEditRefresh] = useState(false);
  const [editMinLifetime, setEditMinLifetime] = useState('');
  const [editGraceP, setEditGraceP] = useState('');
  const [editRateLimit, setEditRateLimit] = useState('');
  const [editSelfSpec, setEditSelfSpec] = useState<SelfIssuedTrustMarkSpec | null>(null);

  const previewPayload = addMode === 'jwt' && jwtInput ? decodeTrustMarkJwt(jwtInput) : null;

  const resetAddForm = () => {
    setJwtInput(''); setTypeInput(''); setIssuerInput('');
    setSelfType(''); setSelfLifetime(''); setSelfRef(''); setSelfLogoUri('');
    setSelfClaims({}); setSelfIncludeExtra(false);
    setRefreshEnabled(false); setRefreshMinLifetime(''); setRefreshGraceP(''); setRefreshRateLimit('');
  };

  const handleAdd = async () => {
    try {
      if (addMode === 'jwt') {
        if (!jwtInput) return;
        await create.mutateAsync({
          trust_mark: jwtInput,
          ...(refreshEnabled && {
            refresh: true,
            ...(refreshMinLifetime && { min_lifetime: Number(refreshMinLifetime) }),
            ...(refreshGraceP && { refresh_grace_period: Number(refreshGraceP) }),
            ...(refreshRateLimit && { refresh_rate_limit: Number(refreshRateLimit) }),
          }),
        });
      } else if (addMode === 'manual') {
        if (!typeInput || !issuerInput) return;
        await create.mutateAsync({
          trust_mark_type: typeInput,
          trust_mark_issuer: issuerInput,
          ...(refreshEnabled && {
            refresh: true,
            ...(refreshMinLifetime && { min_lifetime: Number(refreshMinLifetime) }),
            ...(refreshGraceP && { refresh_grace_period: Number(refreshGraceP) }),
            ...(refreshRateLimit && { refresh_rate_limit: Number(refreshRateLimit) }),
          }),
        });
      } else {
        if (!selfType) return;
        const spec: SelfIssuedTrustMarkSpec = {
          ...(selfLifetime && { lifetime: Number(selfLifetime) }),
          ...(selfRef && { ref: selfRef }),
          ...(selfLogoUri && { logo_uri: selfLogoUri }),
          ...(Object.keys(selfClaims).length > 0 && { additional_claims: selfClaims }),
          ...(selfIncludeExtra && { include_extra_claims_in_info: true }),
        };
        await create.mutateAsync({ trust_mark_type: selfType, self_issuance_spec: spec });
      }
      toast({ title: 'Trust mark added' });
      resetAddForm();
      setIsAddOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add trust mark' });
    }
  };

  const openEdit = (tm: TrustMark) => {
    setEditingTm(tm);
    setEditIssuer(tm.trust_mark_issuer ?? '');
    setEditJwt('');
    setEditRefresh(tm.refresh ?? false);
    setEditMinLifetime(tm.min_lifetime?.toString() ?? '');
    setEditGraceP(tm.refresh_grace_period?.toString() ?? '');
    setEditRateLimit(tm.refresh_rate_limit?.toString() ?? '');
    setEditSelfSpec(tm.self_issuance_spec ?? null);
  };

  const handlePatch = async () => {
    if (!editingTm) return;
    try {
      const data: Record<string, unknown> = { refresh: editRefresh };
      if (editIssuer !== (editingTm.trust_mark_issuer ?? '')) data.trust_mark_issuer = editIssuer || undefined;
      if (editJwt) data.trust_mark = editJwt;
      if (editRefresh) {
        if (editMinLifetime) data.min_lifetime = Number(editMinLifetime);
        if (editGraceP) data.refresh_grace_period = Number(editGraceP);
        if (editRateLimit) data.refresh_rate_limit = Number(editRateLimit);
      }
      if (editSelfSpec) data.self_issuance_spec = editSelfSpec;
      await patch.mutateAsync({ id: editingTm.id as number, data: data as any });
      toast({ title: 'Trust mark updated' });
      setEditingTm(null);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update trust mark' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Trust mark removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove trust mark' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unavailable</h3>
        <p className="text-muted-foreground text-sm">Entity configuration trust marks could not be loaded.</p>
      </div>
    );
  }

  const addModeLabel: Record<AddMode, string> = { jwt: 'Paste JWT', manual: 'Type + Issuer', self: 'Self-Issued' };
  const addValid = addMode === 'jwt' ? !!jwtInput : addMode === 'manual' ? (!!typeInput && !!issuerInput) : !!selfType;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trust marks published inside your own entity configuration statement.
        </p>
        {canCreate && (
          <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetAddForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Trust Mark</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Trust Mark</DialogTitle>
                <DialogDescription>Choose how to add a trust mark to your entity configuration.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Mode toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(['jwt', 'manual', 'self'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setAddMode(m)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                        addMode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {addModeLabel[m]}
                    </button>
                  ))}
                </div>

                {addMode === 'jwt' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Trust Mark JWT</Label>
                      <Textarea
                        placeholder="eyJhbGci…"
                        value={jwtInput}
                        onChange={e => setJwtInput(e.target.value)}
                        className="font-mono text-xs min-h-[100px]"
                      />
                      {previewPayload && (
                        <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded">
                          {previewPayload.id && <div><span className="font-medium">Type: </span>{String(previewPayload.id)}</div>}
                          {previewPayload.iss && <div><span className="font-medium">Issuer: </span>{String(previewPayload.iss)}</div>}
                          {previewPayload.exp && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Validity:</span>
                              <ValidityBadge jwt={jwtInput} />
                              <span>{formatExpiryRelative(previewPayload.exp)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <RefreshFields
                      refresh={refreshEnabled} minLifetime={refreshMinLifetime} graceP={refreshGraceP} rateLimit={refreshRateLimit}
                      onChange={f => {
                        if (f.refresh !== undefined) setRefreshEnabled(f.refresh);
                        if (f.minLifetime !== undefined) setRefreshMinLifetime(f.minLifetime);
                        if (f.graceP !== undefined) setRefreshGraceP(f.graceP);
                        if (f.rateLimit !== undefined) setRefreshRateLimit(f.rateLimit);
                      }}
                    />
                  </div>
                )}

                {addMode === 'manual' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Trust Mark Type (URI) <span className="text-destructive">*</span></Label>
                      <Input placeholder="https://fed.example.org/trust-marks/member" value={typeInput} onChange={e => setTypeInput(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Issuer Entity ID <span className="text-destructive">*</span></Label>
                      <Input placeholder="https://tmi.example.org" value={issuerInput} onChange={e => setIssuerInput(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Both type and issuer are required to fetch an external trust mark.</p>
                    </div>
                    <RefreshFields
                      refresh={refreshEnabled} minLifetime={refreshMinLifetime} graceP={refreshGraceP} rateLimit={refreshRateLimit}
                      onChange={f => {
                        if (f.refresh !== undefined) setRefreshEnabled(f.refresh);
                        if (f.minLifetime !== undefined) setRefreshMinLifetime(f.minLifetime);
                        if (f.graceP !== undefined) setRefreshGraceP(f.graceP);
                        if (f.rateLimit !== undefined) setRefreshRateLimit(f.rateLimit);
                      }}
                    />
                  </div>
                )}

                {addMode === 'self' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      The entity will issue this trust mark to itself. The JWT is regenerated automatically based on the lifetime.
                    </p>
                    <div className="space-y-2">
                      <Label>Trust Mark Type (URI) <span className="text-destructive">*</span></Label>
                      <Input placeholder="https://fed.example.org/trust-marks/self-certified" value={selfType} onChange={e => setSelfType(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Lifetime (seconds)</Label>
                        <Input type="number" placeholder="e.g. 86400" value={selfLifetime} onChange={e => setSelfLifetime(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo URI</Label>
                        <Input placeholder="https://..." value={selfLogoUri} onChange={e => setSelfLogoUri(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reference URL</Label>
                      <Input placeholder="https://..." value={selfRef} onChange={e => setSelfRef(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Claims</Label>
                      <AdditionalClaimsEditor claims={selfClaims} onChange={setSelfClaims} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Expose Claims in Info Endpoint</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Include additional claims in the trust mark info endpoint response.</p>
                      </div>
                      <Switch checked={selfIncludeExtra} onCheckedChange={setSelfIncludeExtra} />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetAddForm(); setIsAddOpen(false); }}>Cancel</Button>
                <Button onClick={handleAdd} disabled={create.isPending || !addValid}>
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {trustMarks.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trust Marks</h3>
          <p className="text-muted-foreground text-sm">Add the trust marks your entity has been issued and wishes to publish.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trust Mark Type</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustMarks.map(tm => {
                const payload = tm.trust_mark ? decodeTrustMarkJwt(tm.trust_mark) : null;
                const validity = getTrustMarkValidity(payload);
                const typeLabel = payload?.id ?? tm.trust_mark_type ?? '—';
                const isSelfIssued = !!tm.self_issuance_spec;
                const issuerLabel = isSelfIssued ? '(self-issued)' : (payload?.iss ?? tm.trust_mark_issuer ?? '—');

                return (
                  <TableRow key={tm.id as number}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={String(typeLabel)}>
                      {String(typeLabel)}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-xs max-w-[160px] truncate ${isSelfIssued ? 'italic text-muted-foreground' : 'text-muted-foreground'}`}
                      title={String(issuerLabel)}
                    >
                      {String(issuerLabel)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isSelfIssued
                          ? <Badge variant="outline" className="text-xs">Self-issued</Badge>
                          : <ValidityBadge status={validity} />
                        }
                        {tm.refresh && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground" title="Auto-refresh enabled" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {isSelfIssued
                        ? (tm.self_issuance_spec?.lifetime ? `${tm.self_issuance_spec.lifetime}s` : 'auto')
                        : payload?.exp
                          ? formatExpiryRelative(payload.exp)
                          : tm.trust_mark ? '—' : <span className="italic">JWT pending</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tm.trust_mark && !isSelfIssued && (
                          <Button variant="ghost" size="icon" title="View decoded payload" onClick={() => setViewJwt(tm.trust_mark!)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(tm)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Trust Mark?</AlertDialogTitle>
                                <AlertDialogDescription>This will remove this trust mark from your entity configuration.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tm.id as number)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* JWT detail viewer */}
      {viewJwt && <JwtDetailDialog jwt={viewJwt} open={true} onClose={() => setViewJwt(null)} />}

      {/* Edit dialog (PATCH) */}
      <Dialog open={!!editingTm} onOpenChange={open => { if (!open) setEditingTm(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trust Mark</DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">{editingTm?.trust_mark_type}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingTm?.self_issuance_spec ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Edit the self-issuance specification for this trust mark.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Lifetime (seconds)</Label>
                    <Input type="number" placeholder="e.g. 86400"
                      value={editSelfSpec?.lifetime?.toString() ?? ''}
                      onChange={e => setEditSelfSpec(s => ({ ...(s ?? {}), lifetime: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URI</Label>
                    <Input placeholder="https://..."
                      value={editSelfSpec?.logo_uri ?? ''}
                      onChange={e => setEditSelfSpec(s => ({ ...(s ?? {}), logo_uri: e.target.value || undefined }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reference URL</Label>
                  <Input placeholder="https://..."
                    value={editSelfSpec?.ref ?? ''}
                    onChange={e => setEditSelfSpec(s => ({ ...(s ?? {}), ref: e.target.value || undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Claims</Label>
                  <AdditionalClaimsEditor
                    claims={(editSelfSpec?.additional_claims as Record<string, unknown>) ?? {}}
                    onChange={c => setEditSelfSpec(s => ({ ...(s ?? {}), additional_claims: Object.keys(c).length > 0 ? c : undefined }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Expose Claims in Info Endpoint</Label>
                  <Switch
                    checked={editSelfSpec?.include_extra_claims_in_info ?? false}
                    onCheckedChange={v => setEditSelfSpec(s => ({ ...(s ?? {}), include_extra_claims_in_info: v }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Issuer Entity ID</Label>
                  <Input placeholder="https://tmi.example.org" value={editIssuer} onChange={e => setEditIssuer(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Replacement JWT <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
                  <Textarea placeholder="eyJhbGci… (optional)" value={editJwt} onChange={e => setEditJwt(e.target.value)} className="font-mono text-xs min-h-[60px]" />
                </div>
                <RefreshFields
                  refresh={editRefresh} minLifetime={editMinLifetime} graceP={editGraceP} rateLimit={editRateLimit}
                  onChange={f => {
                    if (f.refresh !== undefined) setEditRefresh(f.refresh);
                    if (f.minLifetime !== undefined) setEditMinLifetime(f.minLifetime);
                    if (f.graceP !== undefined) setEditGraceP(f.graceP);
                    if (f.rateLimit !== undefined) setEditRateLimit(f.rateLimit);
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTm(null)}>Cancel</Button>
            <Button onClick={handlePatch} disabled={patch.isPending}>
              {patch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
