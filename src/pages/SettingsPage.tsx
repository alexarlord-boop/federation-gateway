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
  Loader2, Trash2, Plus, Key, Shield, FileText, XCircle, RotateCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeTrustAnchor } = useTrustAnchor();
  const { toast } = useToast();
  const { isFeatureEnabled, isLoading: capLoading } = useCapabilities();
  const [theme, setTheme] = useState(() => localStorage.getItem('ui_theme') || 'theme-default');

  // Capability flags — tabs are hidden when their backend feature is disabled
  const showAuthorityHints = isFeatureEnabled('authority_hints');
  const showEntityConfig = isFeatureEnabled('entity_configuration');
  const showKeys = isFeatureEnabled('keys') || isFeatureEnabled('jwks_management');
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
    metadata, isLoading: metaLoading, updateAll: updateMeta,
  } = useEntityConfigMetadata();

  const [newClaimKey, setNewClaimKey] = useState('');
  const [newClaimValue, setNewClaimValue] = useState('');
  const [lifetimeVal, setLifetimeVal] = useState('');
  const [newTmId, setNewTmId] = useState('');
  const [newTmTrust, setNewTmTrust] = useState('');
  const [metaDraft, setMetaDraft] = useState('');
  const [metaEditing, setMetaEditing] = useState(false);

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
              <p className="text-2xl font-mono">{(lifetime as any) ?? <span className="text-muted-foreground text-base">Not set</span>}</p>
              <div className="flex gap-2">
                <Input type="number" min={60} placeholder="e.g. 86400" value={lifetimeVal} onChange={e => setLifetimeVal(e.target.value)} className="w-36" />
                <Button size="sm" disabled={!lifetimeVal || updateLifetime.isPending}
                  onClick={() => updateLifetime.mutateAsync(Number(lifetimeVal) as any).then(() => { setLifetimeVal(''); toast({ title: 'Updated' }); })}>
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
                      <div>
                        <span className="text-sm font-mono">{tm.id ?? tm.trust_mark_id}</span>
                        {tm.trust_mark && <span className="text-xs text-muted-foreground ml-2">(JWT present)</span>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeTm.mutateAsync(tm.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trust marks</p>
              )}
              <div className="flex gap-2">
                <Input placeholder="trust_mark_id" value={newTmId} onChange={e => setNewTmId(e.target.value)} className="max-w-[250px]" />
                <Input placeholder="trust_mark JWT (optional)" value={newTmTrust} onChange={e => setNewTmTrust(e.target.value)} className="flex-1" />
                <Button size="sm" disabled={!newTmId || createTm.isPending}
                  onClick={() => {
                    createTm.mutateAsync({ trust_mark_id: newTmId, trust_mark: newTmTrust || undefined } as any)
                      .then(() => { setNewTmId(''); setNewTmTrust(''); toast({ title: 'Trust mark added' }); })
                      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to add trust mark' }));
                  }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Entity Config Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Metadata</CardTitle>
          <CardDescription>Metadata published in your entity configuration (per entity type)</CardDescription>
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
    keys, keysLoading, deleteKey, triggerRotation,
    kmsInfo, kmsInfoLoading, updateAlgorithm,
    rotationOptions, rotationLoading, updateRotation,
    publishedJwks, jwksLoading,
  } = useKeyManagement();

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
          {rotationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : rotationOptions ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Auto Rotate</Label>
                <p className="font-mono mt-1">{(rotationOptions as any).auto_rotate ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Rotation Interval</Label>
                <p className="font-mono mt-1">{(rotationOptions as any).rotation_interval_seconds ?? '—'}s</p>
              </div>
            </div>
          ) : null}
          <Button
            variant="outline"
            onClick={() => triggerRotation.mutateAsync({}).then(() => toast({ title: 'Rotation triggered' }))}
            disabled={triggerRotation.isPending}
          >
            {triggerRotation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
            Trigger Key Rotation
          </Button>
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
    addAllowedEntityType, deleteAllowedEntityType,
  } = useGeneralConstraints();
  const {
    operators, isLoading: opsLoading, add: addOp, remove: removeOp,
  } = useCriticalPolicyOperators();

  const [newMaxPath, setNewMaxPath] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const [newOp, setNewOp] = useState('');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const maxPath = constraints?.max_path_length;
  const naming = constraints?.naming_constraints;
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
            <CardDescription>Permitted / excluded entity ID patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {naming ? (
              <ScrollArea className="h-40 rounded-md border p-3">
                <pre className="text-xs font-mono">{JSON.stringify(naming, null, 2)}</pre>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured</p>
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
  const { policies, isLoading, updateAll } = useGeneralMetadataPolicies();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

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
      <div className="flex gap-2">
        {!editing && <Button variant="outline" size="sm" onClick={startEdit}><FileText className="w-4 h-4 mr-2" /> Edit JSON</Button>}
      </div>

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
              <CardHeader>
                <CardTitle className="text-base font-mono">{entityType}</CardTitle>
                <CardDescription>{Object.keys(claims as Record<string, any>).length} claim(s)</CardDescription>
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
