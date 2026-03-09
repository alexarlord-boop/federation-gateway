import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthorityHints } from '@/hooks/useAuthorityHints';
import { useEntityConfiguration } from '@/hooks/useEntityConfiguration';
import { useKeyManagement } from '@/hooks/useKeyManagement';
import { useGeneralConstraints } from '@/hooks/useGeneralConstraints';
import { useGeneralMetadataPolicies } from '@/hooks/useGeneralMetadataPolicies';
import { useCriticalPolicyOperators } from '@/hooks/useCriticalPolicyOperators';
import { useEntityConfigTrustMarks } from '@/hooks/useEntityConfigTrustMarks';
import { useEntityConfigMetadata } from '@/hooks/useEntityConfigMetadata';
import { useCapabilities } from '@/contexts/CapabilityContext';
import { CapabilityGuard } from '@/components/CapabilityGuard';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, Trash2, Plus, Key, Shield, FileText, XCircle, RotateCw, Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ValidityBadge } from '@/components/trust-marks/ValidityBadge';
import { JwtDetailDialog } from '@/components/trust-marks/JwtDetailDialog';

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeTrustAnchor } = useTrustAnchor();
  const { toast } = useToast();
  const { isFeatureEnabled, isLoading: capLoading } = useCapabilities();
  const [theme, setTheme] = useState(() => localStorage.getItem('ui_theme') || 'theme-default');

  // Capability flags — tabs are hidden when their backend feature is disabled
  const showAuthorityHints = isFeatureEnabled('authority_hints');
  const showEntityConfig = isFeatureEnabled('entity_configuration');
  const showKeys = isFeatureEnabled('keys');
  const showConstraints = isFeatureEnabled('general_constraints');
  const showPolicies = isFeatureEnabled('general_metadata_policies');

  const applyTheme = (value: string) => {
    const root = document.documentElement;
    root.classList.remove('theme-default', 'theme-grayscale', 'theme-indigo');
    root.classList.add(value);
    localStorage.setItem('ui_theme', value);
    setTheme(value);
  };

  // Show a loading skeleton while capabilities are being fetched
  if (capLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full max-w-lg" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Manage your account, federation configuration, and key management</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          {showEntityConfig && <TabsTrigger value="entity-config">Entity Config</TabsTrigger>}
          {showKeys && <TabsTrigger value="keys">Keys &amp; KMS</TabsTrigger>}
          {showConstraints && <TabsTrigger value="constraints">Constraints</TabsTrigger>}
          {showPolicies && <TabsTrigger value="policies">Metadata Policies</TabsTrigger>}
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* ───────── GENERAL ───────── */}
        <TabsContent value="general" className="space-y-6">
          <AppearanceSection theme={theme} applyTheme={applyTheme} />
          <CapabilityGuard capability="authority_hints">
            <AuthorityHintsSection />
          </CapabilityGuard>
        </TabsContent>

        {/* ───────── ENTITY CONFIGURATION ───────── */}
        {showEntityConfig && (
          <TabsContent value="entity-config" className="space-y-6">
            <CapabilityGuard capability="entity_configuration" fallback="placeholder">
              {!activeTrustAnchor ? <NoInstanceCard /> : <EntityConfigSection />}
            </CapabilityGuard>
          </TabsContent>
        )}

        {/* ───────── KEYS & KMS ───────── */}
        {showKeys && (
          <TabsContent value="keys" className="space-y-6">
            <CapabilityGuard capability="keys" fallback="placeholder">
              {!activeTrustAnchor ? <NoInstanceCard /> : <KeyManagementSection />}
            </CapabilityGuard>
          </TabsContent>
        )}

        {/* ───────── CONSTRAINTS ───────── */}
        {showConstraints && (
          <TabsContent value="constraints" className="space-y-6">
            <CapabilityGuard capability="general_constraints" fallback="placeholder">
              {!activeTrustAnchor ? <NoInstanceCard /> : <GeneralConstraintsSection />}
            </CapabilityGuard>
          </TabsContent>
        )}

        {/* ───────── METADATA POLICIES ───────── */}
        {showPolicies && (
          <TabsContent value="policies" className="space-y-6">
            <CapabilityGuard capability="general_metadata_policies" fallback="placeholder">
              {!activeTrustAnchor ? <NoInstanceCard /> : <MetadataPoliciesSection />}
            </CapabilityGuard>
          </TabsContent>
        )}

        {/* ───────── ACCOUNT ───────── */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} disabled />
                </div>
              </div>
              {user?.organizationName && (
                <div className="space-y-2">
                  <Label htmlFor="org">Organization</Label>
                  <Input id="org" defaultValue={user.organizationName} disabled />
                </div>
              )}
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent><Button variant="outline">Update Password</Button></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function NoInstanceCard() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        Select a federation instance to manage this section
      </CardContent>
    </Card>
  );
}

/* ─── Appearance ─── */
function AppearanceSection({ theme, applyTheme }: { theme: string; applyTheme: (v: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose the visual theme</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="theme">Theme</Label>
          <Select value={theme} onValueChange={applyTheme}>
            <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="theme-default">Default (Teal/Navy)</SelectItem>
              <SelectItem value="theme-grayscale">Grayscale</SelectItem>
              <SelectItem value="theme-indigo">Indigo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Authority Hints ─── */
function AuthorityHintsSection() {
  const { hints, isLoading, addHint, deleteHint } = useAuthorityHints();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('authority_hints', 'create');
  const canDelete = useOperationAllowed('authority_hints', 'delete');
  const [newHint, setNewHint] = useState('');

  const handleAdd = async () => {
    if (!newHint) return;
    try {
      await addHint.mutateAsync({ entity_id: newHint });
      setNewHint('');
      toast({ title: 'Success', description: 'Authority hint added' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add hint' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHint.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Authority hint removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove hint' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authority Hints</CardTitle>
        <CardDescription>List of superiors (intermediaries) this federation operator points to</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="animate-spin w-4 h-4" />
        ) : (
          <div className="space-y-2 mb-4">
            {hints?.map((hint: any) => (
              <div key={hint.id} className="flex items-center justify-between p-2 rounded bg-muted">
                <span className="text-sm font-mono">{hint.entity_id}</span>
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hint.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {hints?.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No authority hints configured.</p>
            )}
          </div>
        )}
        {canCreate && (
          <div className="flex gap-2">
            <Input
              placeholder="https://superior-federation.example.org"
              value={newHint}
              onChange={e => setNewHint(e.target.value)}
            />
            <Button onClick={handleAdd} disabled={!newHint || addHint.isPending}>
              {addHint.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Entity Configuration ─── */
function EntityConfigSection() {
  const { toast } = useToast();
  const {
    entityConfiguration, configLoading,
    claims, claimsLoading, addClaim, deleteClaim,
    lifetime, lifetimeLoading, updateLifetime,
  } = useEntityConfiguration();
  const {
    trustMarks, isLoading: tmLoading, create: createTm, remove: removeTm,
  } = useEntityConfigTrustMarks();
  const {
    metadata, isLoading: metaLoading, updateAll: updateMeta, updateClaim, deleteClaim: deleteMetaClaim,
  } = useEntityConfigMetadata();

  const [newClaimKey, setNewClaimKey] = useState('');
  const [newClaimValue, setNewClaimValue] = useState('');
  const [lifetimeVal, setLifetimeVal] = useState('');
  const [newTmType, setNewTmType] = useState('');
  const [newTmIssuer, setNewTmIssuer] = useState('');
  const [newTmTrust, setNewTmTrust] = useState('');
  const [viewJwt, setViewJwt] = useState<string | null>(null);
  const [metaDraft, setMetaDraft] = useState('');
  const [metaEditing, setMetaEditing] = useState(false);

  // All federation_entity metadata endpoint fields (§5.1.1 + §8.x)
  const FEDERATION_ENDPOINT_FIELDS = [
    { claim: 'federation_fetch_endpoint',            label: 'Fetch Endpoint',                hint: 'MUST for Trust Anchors & intermediates. Used to download Subordinate Statements.' },
    { claim: 'federation_list_endpoint',             label: 'List Endpoint',                 hint: 'MUST for Trust Anchors & intermediates. Lists Immediate Subordinates.' },
    { claim: 'federation_resolve_endpoint',          label: 'Resolve Endpoint',              hint: 'Optional. Returns Resolved Metadata + Trust Chain for a given subject.' },
    { claim: 'federation_historical_keys_endpoint',  label: 'Historical Keys Endpoint',      hint: 'Optional. Allows retrieval of previously used signing keys.' },
    { claim: 'federation_trust_mark_status_endpoint', label: 'Trust Mark Status Endpoint',  hint: 'Trust Mark Issuers SHOULD publish this. Checks whether a trust mark is still active.' },
    { claim: 'federation_trust_mark_list_endpoint',   label: 'Trust Mark List Endpoint',    hint: 'Optional for Trust Mark Issuers. Lists entities that hold a particular trust mark.' },
    { claim: 'federation_trust_mark_endpoint',        label: 'Trust Mark Fetch Endpoint',   hint: 'Optional for Trust Mark Issuers. Returns the trust mark JWT for a subject.' },
  ];

  const currentFedEndpoints: Record<string, string> = Object.fromEntries(
    FEDERATION_ENDPOINT_FIELDS.map(({ claim }) => [
      claim,
      (metadata as any)?.federation_entity?.[claim] ?? '',
    ])
  );

  // Keep old alias for backwards compat in render
  const TRUST_MARK_ENDPOINT_FIELDS = FEDERATION_ENDPOINT_FIELDS;
  const currentTmEndpoints: Record<string, string> = currentFedEndpoints;

  return (
    <div className="space-y-6">
      {/* Lifetime */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Lifetime</CardTitle>
          <CardDescription>How long the signed entity configuration statement is valid (seconds)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lifetimeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              <p className="text-2xl font-mono">{(lifetime as any)?.lifetime_seconds ?? <span className="text-muted-foreground text-base">Not set</span>}</p>
              <div className="flex gap-2">
                <Input type="number" min={60} placeholder="e.g. 86400" value={lifetimeVal} onChange={e => setLifetimeVal(e.target.value)} className="w-36" />
                <Button size="sm" disabled={!lifetimeVal || updateLifetime.isPending}
                  onClick={() => updateLifetime.mutateAsync({ lifetime_seconds: Number(lifetimeVal) } as any).then(() => { setLifetimeVal(''); toast({ title: 'Updated' }); })}>
                  Set
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Claims */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Claims</CardTitle>
          <CardDescription>Custom claims added to the entity configuration statement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {claimsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              {(claims as any[]).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead className="w-12" /></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(claims as any[]).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.key ?? c.claim_key}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{JSON.stringify(c.value ?? c.claim_value)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteClaim.mutateAsync(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No additional claims</p>
              )}
              <div className="flex gap-2">
                <Input placeholder="claim key" value={newClaimKey} onChange={e => setNewClaimKey(e.target.value)} className="max-w-[200px]" />
                <Input placeholder="value (JSON)" value={newClaimValue} onChange={e => setNewClaimValue(e.target.value)} className="flex-1" />
                <Button size="sm" disabled={!newClaimKey || !newClaimValue || addClaim.isPending}
                  onClick={() => {
                    let parsed: any;
                    try { parsed = JSON.parse(newClaimValue); } catch { parsed = newClaimValue; }
                    addClaim.mutateAsync({ claim_key: newClaimKey, claim_value: parsed } as any)
                      .then(() => { setNewClaimKey(''); setNewClaimValue(''); toast({ title: 'Claim added' }); })
                      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to add claim' }));
                  }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Entity Config Trust Marks */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Configuration Trust Marks</CardTitle>
          <CardDescription>Trust marks included in your own entity configuration statement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              {trustMarks.length > 0 ? (
                <div className="space-y-2">
                  {trustMarks.map((tm: any) => (
                    <div key={tm.id} className="flex items-center justify-between p-2 rounded bg-muted">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-mono truncate">{tm.id ?? tm.trust_mark_id}</span>
                        {tm.trust_mark && <ValidityBadge jwt={tm.trust_mark} />}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {tm.trust_mark && (
                          <Button variant="ghost" size="icon" title="View JWT" onClick={() => setViewJwt(tm.trust_mark)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => removeTm.mutateAsync(tm.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trust marks</p>
              )}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="trust_mark_type URI" value={newTmType} onChange={e => setNewTmType(e.target.value)} className="flex-1" />
                  <Input placeholder="trust_mark_issuer entity ID" value={newTmIssuer} onChange={e => setNewTmIssuer(e.target.value)} className="flex-1" />
                </div>
                <div className="flex gap-2">
                  <Input placeholder="trust_mark JWT (optional)" value={newTmTrust} onChange={e => setNewTmTrust(e.target.value)} className="flex-1" />
                  <Button size="sm" disabled={!newTmType || createTm.isPending}
                    onClick={() => {
                      createTm.mutateAsync({ trust_mark_type: newTmType, trust_mark_issuer: newTmIssuer || undefined, trust_mark: newTmTrust || undefined })
                        .then(() => { setNewTmType(''); setNewTmIssuer(''); setNewTmTrust(''); toast({ title: 'Trust mark added' }); })
                        .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to add trust mark' }));
                    }}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* JWT detail viewer */}
      <JwtDetailDialog
        jwt={viewJwt ?? ''}
        open={viewJwt !== null}
        onClose={() => setViewJwt(null)}
      />

      {/* Federation Entity Metadata Endpoints (§5.1.1) */}
      <Card>
        <CardHeader>
          <CardTitle>Federation Entity Endpoints</CardTitle>
          <CardDescription>
            URLs published under the <code className="text-xs bg-muted px-1 rounded">federation_entity</code> metadata key.
            These are derived from the server configuration and are read-only here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              {TRUST_MARK_ENDPOINT_FIELDS.map(({ claim, label, hint }) => {
                const saved = currentTmEndpoints[claim];
                return (
                  <div key={claim} className="space-y-1.5">
                    <Label htmlFor={`tme-${claim}`}>{label}</Label>
                    <Input
                      id={`tme-${claim}`}
                      readOnly
                      value={saved ?? ''}
                      placeholder="(not configured)"
                      className="flex-1 font-mono text-sm bg-muted/50 cursor-default"
                    />
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Informational Metadata (§5.2.2) */}
      <InformationalMetadataCard metadata={metadata} updateClaim={updateClaim} deleteMetaClaim={deleteMetaClaim} metaLoading={metaLoading} />

      {/* Entity Config Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Metadata (Raw)</CardTitle>
          <CardDescription>Full metadata JSON published in the entity configuration (per entity type)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : metaEditing ? (
            <>
              <Textarea className="font-mono text-xs min-h-[250px]" value={metaDraft} onChange={e => setMetaDraft(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" disabled={updateMeta.isPending}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(metaDraft);
                      updateMeta.mutateAsync(parsed).then(() => { setMetaEditing(false); toast({ title: 'Metadata saved' }); });
                    } catch { toast({ variant: 'destructive', title: 'Invalid JSON' }); }
                  }}>
                  {updateMeta.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMetaEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <pre className="text-xs font-mono">{JSON.stringify(metadata, null, 2)}</pre>
              </ScrollArea>
              <Button size="sm" variant="outline" onClick={() => { setMetaDraft(JSON.stringify(metadata, null, 2)); setMetaEditing(true); }}>
                Edit JSON
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Raw Entity Configuration Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Entity Configuration</CardTitle>
          <CardDescription>The full signed entity-configuration statement (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <ScrollArea className="h-[300px] rounded-md border p-3">
              <pre className="text-xs font-mono">{JSON.stringify(entityConfiguration, null, 2)}</pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Key Management ─── */
function KeyManagementSection() {
  const { toast } = useToast();
  const {
    keys, keysLoading, addKey, deleteKey, triggerRotation,
    kmsInfo, kmsInfoLoading, updateAlgorithm,
    rotationOptions, rotationLoading, updateRotation,
    publishedJwks, jwksLoading,
  } = useKeyManagement();
  const [rotIntervalDraft, setRotIntervalDraft] = useState('');
  const [rotAutoRotateDraft, setRotAutoRotateDraft] = useState<boolean | null>(null);
  const [addKeyDraft, setAddKeyDraft] = useState('');

  const autoRotate = rotAutoRotateDraft ?? ((rotationOptions as any)?.auto_rotate ?? false);
  const rotInterval = (rotationOptions as any)?.rotation_interval_seconds;

  return (
    <div className="space-y-6">
      {/* KMS Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> KMS Information</CardTitle>
          <CardDescription>Key Management System configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {kmsInfoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : kmsInfo ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Algorithm</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-mono">{(kmsInfo as any).alg ?? 'N/A'}</Badge>
                  <Select
                    onValueChange={(v) => updateAlgorithm.mutateAsync(v as any).then(() => toast({ title: 'Algorithm updated' }))}
                    defaultValue={(kmsInfo as any).alg}
                  >
                    <SelectTrigger className="w-36"><SelectValue placeholder="Change" /></SelectTrigger>
                    <SelectContent>
                      {['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'].map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">RSA Key Length</Label>
                <p className="font-mono mt-1">{(kmsInfo as any).rsa_key_length ?? '—'}</p>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">KMS info not available</p>}
        </CardContent>
      </Card>

      {/* Rotation */}
      <Card>
        <CardHeader>
          <CardTitle>Key Rotation</CardTitle>
          <CardDescription>Configure automatic rotation and trigger manual rotation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rotationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Auto Rotate</p>
                    <p className="text-xs text-muted-foreground">Automatically rotate keys on schedule</p>
                  </div>
                  <Switch
                    checked={autoRotate}
                    onCheckedChange={(v) => {
                      setRotAutoRotateDraft(v);
                      updateRotation.mutateAsync({ ...(rotationOptions as any), auto_rotate: v })
                        .then(() => { setRotAutoRotateDraft(null); toast({ title: v ? 'Auto-rotate enabled' : 'Auto-rotate disabled' }); })
                        .catch(() => { setRotAutoRotateDraft(null); toast({ variant: 'destructive', title: 'Failed to update' }); });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Rotation Interval (seconds)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={60}
                      placeholder={rotInterval != null ? String(rotInterval) : 'e.g. 2592000'}
                      value={rotIntervalDraft}
                      onChange={e => setRotIntervalDraft(e.target.value)}
                      className="w-36 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!rotIntervalDraft || updateRotation.isPending}
                      onClick={() => {
                        updateRotation.mutateAsync({ ...(rotationOptions as any), rotation_interval_seconds: Number(rotIntervalDraft) })
                          .then(() => { setRotIntervalDraft(''); toast({ title: 'Interval updated' }); })
                          .catch(() => toast({ variant: 'destructive', title: 'Failed to update interval' }));
                      }}
                    >
                      {updateRotation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Set'}
                    </Button>
                  </div>
                  {rotInterval != null && (
                    <p className="text-xs text-muted-foreground">Current: {rotInterval}s ({Math.round(rotInterval / 86400)}d)</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => triggerRotation.mutateAsync({}).then(() => toast({ title: 'Rotation triggered' }))}
                disabled={triggerRotation.isPending}
              >
                {triggerRotation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
                Trigger Key Rotation Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Public Keys</CardTitle>
          <CardDescription>Keys registered in this federation instance</CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (keys as any[]).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key ID (kid)</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Use</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keys as any[]).map((k: any) => (
                  <TableRow key={k.kid}>
                    <TableCell className="font-mono text-sm">{k.kid}</TableCell>
                    <TableCell><Badge variant="outline">{k.alg ?? k.kty ?? '—'}</Badge></TableCell>
                    <TableCell>{k.use ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() =>
                        deleteKey.mutateAsync({ kid: k.kid }).then(() => toast({ title: 'Key deleted' }))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">No keys found</p>}
        </CardContent>
      </Card>

      {/* Add Public Key */}
      <Card>
        <CardHeader>
          <CardTitle>Add Public Key</CardTitle>
          <CardDescription>Paste a JWK JSON object to register a new public key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="font-mono text-xs min-h-[120px]"
            placeholder={'{\n  "kty": "EC",\n  "kid": "my-key-1",\n  "crv": "P-256",\n  "x": "...",\n  "y": "..."\n}'}
            value={addKeyDraft}
            onChange={e => setAddKeyDraft(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!addKeyDraft.trim() || addKey.isPending}
            onClick={() => {
              let jwk: any;
              try { jwk = JSON.parse(addKeyDraft); } catch {
                toast({ variant: 'destructive', title: 'Invalid JSON' }); return;
              }
              addKey.mutateAsync({ key: jwk })
                .then(() => { setAddKeyDraft(''); toast({ title: 'Key added' }); })
                .catch((e: any) => toast({ variant: 'destructive', title: 'Failed to add key', description: e?.message }));
            }}
          >
            {addKey.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Key
          </Button>
        </CardContent>
      </Card>

      {/* Published JWKS */}
      <Card>
        <CardHeader>
          <CardTitle>Published JWKS</CardTitle>
          <CardDescription>The JSON Web Key Set published by this instance</CardDescription>
        </CardHeader>
        <CardContent>
          {jwksLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <ScrollArea className="h-[250px] rounded-md border p-3">
              <pre className="text-xs font-mono">{JSON.stringify(publishedJwks, null, 2)}</pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── General Constraints ─── */
function GeneralConstraintsSection() {
  const { toast } = useToast();
  const {
    constraints, isLoading,
    setMaxPathLength, deleteMaxPathLength,
    setNamingConstraints, deleteNamingConstraints,
    addAllowedEntityType, deleteAllowedEntityType,
  } = useGeneralConstraints();
  const {
    operators, isLoading: opsLoading, add: addOp, remove: removeOp,
  } = useCriticalPolicyOperators();

  const [newMaxPath, setNewMaxPath] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const [newOp, setNewOp] = useState('');
  const [newPermitted, setNewPermitted] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const maxPath = constraints?.max_path_length;
  const naming = constraints?.naming_constraints;
  const permitted: string[] = naming?.permitted ?? [];
  const excluded: string[] = naming?.excluded ?? [];
  const allowed: string[] = (constraints as any)?.allowed_entity_types ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Path Length */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Max Path Length</CardTitle>
            <CardDescription>Maximum depth of the trust chain for all subordinates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-mono">{maxPath != null ? maxPath : <span className="text-muted-foreground text-base">Not set</span>}</p>
            <div className="flex gap-2">
              <Input type="number" min={0} placeholder="e.g. 2" value={newMaxPath} onChange={e => setNewMaxPath(e.target.value)} className="w-24" />
              <Button size="sm" disabled={!newMaxPath || setMaxPathLength.isPending}
                onClick={() => setMaxPathLength.mutateAsync(Number(newMaxPath)).then(() => { setNewMaxPath(''); toast({ title: 'Updated' }); })}>
                Set
              </Button>
              {maxPath != null && (
                <Button size="sm" variant="ghost" onClick={() => deleteMaxPathLength.mutateAsync()}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Naming Constraints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Naming Constraints</CardTitle>
            <CardDescription>
              URI domain patterns that subordinate entity identifiers must match.
              A leading dot means any subdomain, e.g. <code className="text-xs bg-muted px-1 rounded">.example.com</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Permitted */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permitted</Label>
              {permitted.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {permitted.map(p => (
                    <Badge key={p} variant="secondary" className="font-mono gap-1 pr-1">
                      {p}
                      <button
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={() => {
                          const next = permitted.filter(x => x !== p);
                          setNamingConstraints.mutateAsync({ permitted: next.length ? next : undefined, excluded: excluded.length ? excluded : undefined })
                            .then(() => toast({ title: 'Updated' }));
                        }}
                      ><XCircle className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None — no domain restrictions on permitted patterns</p>
              )}
              <div className="flex gap-2">
                <Input placeholder=".example.com" value={newPermitted} onChange={e => setNewPermitted(e.target.value)} className="max-w-xs font-mono text-sm" />
                <Button size="sm" disabled={!newPermitted.trim() || setNamingConstraints.isPending}
                  onClick={() => {
                    const next = [...permitted, newPermitted.trim()];
                    setNamingConstraints.mutateAsync({ permitted: next, excluded: excluded.length ? excluded : undefined })
                      .then(() => { setNewPermitted(''); toast({ title: 'Permitted pattern added' }); });
                  }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
            <Separator />
            {/* Excluded */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Excluded</Label>
              {excluded.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {excluded.map(e => (
                    <Badge key={e} variant="destructive" className="font-mono gap-1 pr-1 bg-destructive/10 text-destructive border-destructive/30">
                      {e}
                      <button
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        onClick={() => {
                          const next = excluded.filter(x => x !== e);
                          setNamingConstraints.mutateAsync({ permitted: permitted.length ? permitted : undefined, excluded: next.length ? next : undefined })
                            .then(() => toast({ title: 'Updated' }));
                        }}
                      ><XCircle className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None — no domains excluded</p>
              )}
              <div className="flex gap-2">
                <Input placeholder="east.example.com" value={newExcluded} onChange={ev => setNewExcluded(ev.target.value)} className="max-w-xs font-mono text-sm" />
                <Button size="sm" variant="outline" disabled={!newExcluded.trim() || setNamingConstraints.isPending}
                  onClick={() => {
                    const next = [...excluded, newExcluded.trim()];
                    setNamingConstraints.mutateAsync({ permitted: permitted.length ? permitted : undefined, excluded: next })
                      .then(() => { setNewExcluded(''); toast({ title: 'Excluded pattern added' }); });
                  }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
            {(permitted.length > 0 || excluded.length > 0) && (
              <Button size="sm" variant="ghost" className="text-destructive"
                onClick={() => deleteNamingConstraints.mutateAsync().then(() => toast({ title: 'Naming constraints cleared' }))}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear all naming constraints
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Allowed Entity Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowed Entity Types</CardTitle>
          <CardDescription>Entity types subordinates may register as (federation-wide default)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowed.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allowed.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button className="ml-1 rounded-full hover:bg-muted p-0.5" onClick={() => deleteAllowedEntityType.mutateAsync(t)}>
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No restrictions — all types allowed</p>
          )}
          <div className="flex gap-2">
            <Input placeholder="openid_relying_party" value={newEntityType} onChange={e => setNewEntityType(e.target.value)} className="max-w-xs" />
            <Button size="sm" disabled={!newEntityType.trim() || addAllowedEntityType.isPending}
              onClick={() => addAllowedEntityType.mutateAsync(newEntityType.trim()).then(() => { setNewEntityType(''); toast({ title: 'Added' }); })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Critical Policy Operators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critical Metadata Policy Operators</CardTitle>
          <CardDescription>Operators listed in metadata_policy_crit that downstream entities must understand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {opsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              {operators.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {operators.map(op => (
                    <Badge key={op} variant="outline" className="gap-1 pr-1 font-mono">
                      {op}
                      <button className="ml-1 rounded-full hover:bg-muted p-0.5" onClick={() => removeOp.mutateAsync(op)}>
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No critical operators declared</p>
              )}
              <div className="flex gap-2">
                <Input placeholder="e.g. regexp" value={newOp} onChange={e => setNewOp(e.target.value)} className="max-w-xs" />
                <Button size="sm" disabled={!newOp.trim() || addOp.isPending}
                  onClick={() => addOp.mutateAsync(newOp.trim()).then(() => { setNewOp(''); toast({ title: 'Operator added' }); })}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Metadata Policies ─── */
function MetadataPoliciesSection() {
  const { toast } = useToast();
  const { policies, isLoading, updateAll, deleteEntityTypePolicy, updateEntityTypePolicy } = useGeneralMetadataPolicies();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [addingEntityType, setAddingEntityType] = useState(false);
  const [newEntityType, setNewEntityType] = useState('');
  const [newEntityPolicy, setNewEntityPolicy] = useState('{}');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const policyEntries = Object.entries(policies as Record<string, any>);

  const startEdit = () => { setDraft(JSON.stringify(policies, null, 2)); setEditing(true); };
  const saveEdit = async () => {
    try {
      const parsed = JSON.parse(draft);
      await updateAll.mutateAsync(parsed);
      setEditing(false);
      toast({ title: 'Saved', description: 'General metadata policies updated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message ?? 'Invalid JSON or save failed' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {!editing && <Button variant="outline" size="sm" onClick={startEdit}><FileText className="w-4 h-4 mr-2" /> Edit JSON</Button>}
        {!editing && !addingEntityType && (
          <Button size="sm" onClick={() => setAddingEntityType(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Entity Type
          </Button>
        )}
      </div>

      {addingEntityType && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add Entity Type Policy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Input
                placeholder="openid_relying_party"
                value={newEntityType}
                onChange={e => setNewEntityType(e.target.value)}
                className="max-w-xs font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Policy JSON</Label>
              <Textarea
                className="font-mono text-xs min-h-[120px]"
                placeholder={'\{\n  "scope": { "subset_of": ["openid", "profile"] }\n}'}
                value={newEntityPolicy}
                onChange={e => setNewEntityPolicy(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Map of claim → operator object</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newEntityType.trim() || updateEntityTypePolicy.isPending}
                onClick={() => {
                  let parsed: any;
                  try { parsed = JSON.parse(newEntityPolicy); } catch {
                    toast({ variant: 'destructive', title: 'Invalid JSON' }); return;
                  }
                  updateEntityTypePolicy.mutateAsync({ entityType: newEntityType.trim(), data: parsed })
                    .then(() => { setAddingEntityType(false); setNewEntityType(''); setNewEntityPolicy('{}'); toast({ title: 'Entity type policy added' }); })
                    .catch((e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }));
                }}
              >
                {updateEntityTypePolicy.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingEntityType(false); setNewEntityType(''); setNewEntityPolicy('{}'); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editing ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit General Metadata Policies (JSON)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="font-mono text-xs min-h-[300px]" value={draft} onChange={e => setDraft(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={updateAll.isPending}>
                {updateAll.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : policyEntries.length > 0 ? (
        <div className="space-y-4">
          {policyEntries.map(([entityType, claims]) => (
            <Card key={entityType}>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base font-mono">{entityType}</CardTitle>
                  <CardDescription>{Object.keys(claims as Record<string, any>).length} claim(s)</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete entity type policy"
                  onClick={() => deleteEntityTypePolicy.mutateAsync(entityType)
                    .then(() => toast({ title: 'Deleted', description: entityType }))
                    .catch(() => toast({ variant: 'destructive', title: 'Failed to delete' }))}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Claim</TableHead><TableHead>Operators</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(claims as Record<string, any>).map(([claim, operators]) => (
                      <TableRow key={claim}>
                        <TableCell className="font-mono text-sm">{claim}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(operators as Record<string, any>).map(([op, val]) => (
                              <Badge key={op} variant="outline" className="text-xs">{op}: {JSON.stringify(val)}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No general metadata policies configured</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Informational Metadata (§5.2.2) ─── */
function InformationalMetadataCard({
  metadata,
  updateClaim,
  deleteMetaClaim,
  metaLoading,
}: {
  metadata: any;
  updateClaim: any;
  deleteMetaClaim: any;
  metaLoading: boolean;
}) {
  const { toast } = useToast();
  const entityType = 'federation_entity';

  const SINGLE_FIELDS: { claim: string; label: string; placeholder: string; hint: string }[] = [
    { claim: 'organization_name', label: 'Organization Name', placeholder: 'My Federation Operator', hint: 'RECOMMENDED. Human-readable name of the organization owning this entity.' },
    { claim: 'display_name',      label: 'Display Name',      placeholder: 'FedOps',                 hint: 'Human-readable name presented to end-users.' },
    { claim: 'description',       label: 'Description',       placeholder: 'Brief description…',     hint: 'Short human-readable description of this entity.' },
    { claim: 'logo_uri',          label: 'Logo URI',          placeholder: 'https://…/logo.svg',     hint: 'URL pointing to a logo image for this entity.' },
    { claim: 'policy_uri',        label: 'Policy URI',        placeholder: 'https://…/policy.html',  hint: 'URL for documentation of conditions and policies relevant to this entity.' },
    { claim: 'information_uri',   label: 'Information URI',   placeholder: 'https://…/info',         hint: 'URL for additional information about this entity.' },
    { claim: 'organization_uri',  label: 'Organization URI',  placeholder: 'https://…',              hint: 'URL of a web page for the organization owning this entity.' },
  ];

  // contacts is an array — manage as a list
  const savedContacts: string[] = metadata?.[entityType]?.contacts ?? [];
  const [newContact, setNewContact] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (metaLoading) return <Card><CardContent className="py-6"><Loader2 className="w-4 h-4 animate-spin" /></CardContent></Card>;

  const saved = (claim: string): string => metadata?.[entityType]?.[claim] ?? '';
  const draftVal = (claim: string) => drafts[claim] ?? saved(claim);
  const isDirty = (claim: string) => draftVal(claim) !== saved(claim);

  const saveField = (claim: string) => {
    const val = draftVal(claim);
    const action = val
      ? updateClaim.mutateAsync({ entityType, claim, value: val })
      : deleteMetaClaim.mutateAsync({ entityType, claim });
    action
      .then(() => {
        setDrafts(p => { const n = { ...p }; delete n[claim]; return n; });
        toast({ title: 'Saved', description: claim });
      })
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: `Failed to update ${claim}` }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informational Metadata</CardTitle>
        <CardDescription>
          Common metadata parameters published under{' '}
          <code className="text-xs bg-muted px-1 rounded">federation_entity</code>.
          These fields describe the organization and are visible to federation participants.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {SINGLE_FIELDS.map(({ claim, label, placeholder, hint }) => (
          <div key={claim} className="space-y-1.5">
            <Label htmlFor={`info-${claim}`}>{label}</Label>
            <div className="flex gap-2">
              <Input
                id={`info-${claim}`}
                placeholder={placeholder}
                value={draftVal(claim)}
                onChange={e => setDrafts(p => ({ ...p, [claim]: e.target.value }))}
                className="flex-1 text-sm"
              />
              <Button size="sm" disabled={!isDirty(claim) || updateClaim.isPending} onClick={() => saveField(claim)}>
                {updateClaim.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
              {saved(claim) && (
                <Button size="sm" variant="ghost" onClick={() => {
                  deleteMetaClaim.mutateAsync({ entityType, claim })
                    .then(() => { setDrafts(p => { const n = { ...p }; delete n[claim]; return n; }); toast({ title: 'Cleared', description: claim }); });
                }}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}

        <Separator />

        {/* contacts — array field */}
        <div className="space-y-2">
          <Label>Contacts</Label>
          <p className="text-xs text-muted-foreground mb-2">
            JSON array with contact persons/emails for this entity.
          </p>
          {savedContacts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {savedContacts.map((c: string) => (
                <Badge key={c} variant="secondary" className="gap-1 pr-1">
                  {c}
                  <button
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    onClick={() => {
                      const next = savedContacts.filter(x => x !== c);
                      (next.length
                        ? updateClaim.mutateAsync({ entityType, claim: 'contacts', value: next })
                        : deleteMetaClaim.mutateAsync({ entityType, claim: 'contacts' })
                      ).then(() => toast({ title: 'Contact removed' }));
                    }}
                  ><XCircle className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No contacts configured</p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="ops@example.org"
              value={newContact}
              onChange={e => setNewContact(e.target.value)}
              className="max-w-xs text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && newContact.trim()) {
                  e.preventDefault();
                  const next = [...savedContacts, newContact.trim()];
                  updateClaim.mutateAsync({ entityType, claim: 'contacts', value: next })
                    .then(() => { setNewContact(''); toast({ title: 'Contact added' }); });
                }
              }}
            />
            <Button size="sm" disabled={!newContact.trim() || updateClaim.isPending}
              onClick={() => {
                const next = [...savedContacts, newContact.trim()];
                updateClaim.mutateAsync({ entityType, claim: 'contacts', value: next })
                  .then(() => { setNewContact(''); toast({ title: 'Contact added' }); });
              }}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
