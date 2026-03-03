import { useState } from 'react';
import {
  Award, Info, Loader2, Plus, Trash2, ChevronRight, Users, FileText,
  Clock, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrustMarkTypes } from '@/hooks/useTrustMarkTypes';
import { useTrustMarkSpecs, useTrustMarkSubjects } from '@/hooks/useTrustMarkIssuance';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { useCapabilities } from '@/contexts/CapabilityContext';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
// Trust mark feature components
import { SelfTrustMarksTab } from '@/components/trust-marks/SelfTrustMarksTab';
import { TrustMarkTypeDetailSheet } from '@/components/trust-marks/TrustMarkTypeDetailSheet';
import { OwnersTab } from '@/components/trust-marks/OwnersTab';
import { IssuersTab } from '@/components/trust-marks/IssuersTab';

// ── Trust Mark Types Tab ────────────────────────────────

function TrustMarkTypesTab() {
  const { trustMarkTypes, isLoading, error, create, remove } = useTrustMarkTypes();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('federation_trust_marks', 'create');
  const canDelete = useOperationAllowed('federation_trust_marks', 'delete');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [detailType, setDetailType] = useState<TrustMarkType | null>(null);

  const handleCreate = async () => {
    if (!newType) return;
    try {
      await create.mutateAsync({ trust_mark_type: newType, description: newDesc || undefined } as any);
      toast({ title: 'Created', description: 'Trust mark type added' });
      setNewType('');
      setNewDesc('');
      setIsCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create trust mark type' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete trust mark type' });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Trust Marks Unavailable</h3>
        <p className="text-muted-foreground text-sm">The connected instance does not support trust mark management, or the feature is disabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trust Mark Type</DialogTitle>
              <DialogDescription>Define a new trust mark type identifier for the federation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tm-type">Trust Mark Type Identifier</Label>
                <Input id="tm-type" placeholder="https://federation.example.org/trust-marks/member" value={newType} onChange={(e) => setNewType(e.target.value)} />
                <p className="text-xs text-muted-foreground">A URI that uniquely identifies this trust mark type.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="tm-desc" placeholder="Members of the federation" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newType || create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {trustMarkTypes.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trust Mark Types</h3>
          <p className="text-muted-foreground">Create one to define what trust marks this federation issues.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type Identifier</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {trustMarkTypes.map((tm) => (
              <TableRow key={tm.id}>
                <TableCell className="font-mono text-xs">{tm.id}</TableCell>
                <TableCell className="font-mono text-sm break-all">{tm.trust_mark_type}</TableCell>
                <TableCell className="text-muted-foreground">{tm.description || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setDetailType(tm)}>
                      <Users className="w-3 h-3 mr-1" />Manage
                    </Button>
                    {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Trust Mark Type?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove this trust mark type.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tm.id as number)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {/* Detail sheet for per-type owner/issuer management */}
      <TrustMarkTypeDetailSheet
        type={detailType}
        open={detailType !== null}
        onClose={() => setDetailType(null)}
      />
    </div>
  );
}

// ── Trust Mark Issuance Specs Tab ───────────────────────

function IssuanceSpecsTab() {
  const { specs, isLoading, error, create, remove } = useTrustMarkSpecs();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('trust_mark_issuance', 'create');
  const canDelete = useOperationAllowed('trust_mark_issuance', 'delete');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSpecType, setNewSpecType] = useState('');
  const [expandedSpec, setExpandedSpec] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newSpecType) return;
    try {
      await create.mutateAsync({ trust_mark_type: newSpecType });
      toast({ title: 'Created', description: 'Issuance spec added' });
      setNewSpecType('');
      setIsCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create issuance spec' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Issuance spec removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete issuance spec' });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Issuance Specs Unavailable</h3>
        <p className="text-muted-foreground text-sm">This feature may not be supported by the connected instance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Spec</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Issuance Spec</DialogTitle>
              <DialogDescription>Define a trust mark issuance specification.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spec-type">Trust Mark Type</Label>
                <Input id="spec-type" placeholder="https://federation.example.org/trust-marks/member" value={newSpecType} onChange={(e) => setNewSpecType(e.target.value)} />
              </div>
            </div>
            {/* Lifetime hint */}
            <p className="text-xs text-muted-foreground px-1">Additional fields (lifetime, ref, logo URI) can be updated after creation.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newSpecType || create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {specs.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Issuance Specs</h3>
          <p className="text-muted-foreground">Create an issuance spec to begin issuing trust marks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {specs.map((spec) => (
            <Card key={spec.id}>
              <CardHeader className="py-3 cursor-pointer" onClick={() => setExpandedSpec(expandedSpec === (spec.id as number) ? null : (spec.id as number))}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedSpec === (spec.id as number) ? 'rotate-90' : ''}`} />
                    <div>
                      <CardTitle className="text-sm font-mono">{spec.trust_mark_type}</CardTitle>
                      {spec.description && <CardDescription className="text-xs mt-1">{spec.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {spec.lifetime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />{spec.lifetime}s
                      </Badge>
                    )}
                    {(spec as any).ref && (
                      <a href={(spec as any).ref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Issuance Spec?</AlertDialogTitle>
                          <AlertDialogDescription>This will also remove all subjects.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(spec.id as number)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedSpec === (spec.id as number) && (
                <CardContent className="pt-0">
                  <SpecSubjectsPanel specId={spec.id as number} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subjects panel inside an expanded spec ──────────────

function SpecSubjectsPanel({ specId }: { specId: number }) {
  const { subjects, isLoading, create, remove, changeStatus } = useTrustMarkSubjects(specId);
  const { toast } = useToast();
  const canCreate = useOperationAllowed('trust_mark_issuance', 'create');
  const canDelete = useOperationAllowed('trust_mark_issuance', 'delete');
  const canUpdate = useOperationAllowed('trust_mark_issuance', 'update');
  const [newEntityId, setNewEntityId] = useState('');

  const handleAdd = async () => {
    if (!newEntityId) return;
    try {
      await create.mutateAsync({ entity_id: newEntityId, status: 'active' });
      toast({ title: 'Added', description: 'Subject added to issuance spec' });
      setNewEntityId('');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add subject' });
    }
  };

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Subjects ({subjects.length})</span>
      </div>
      {subjects.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono text-xs break-all">{sub.entity_id}</TableCell>
                <TableCell><Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={sub.status === 'active'}
                          onCheckedChange={(checked) =>
                            changeStatus.mutate({ subjectId: sub.id as number, status: checked ? 'active' : 'suspended' })
                          }
                        />
                        <span className="text-xs text-muted-foreground">{sub.status === 'active' ? 'Active' : 'Suspended'}</span>
                      </div>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(sub.id as number)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canCreate && (
      <div className="flex gap-2">
        <Input placeholder="https://entity.example.org" value={newEntityId} onChange={(e) => setNewEntityId(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={handleAdd} disabled={!newEntityId || create.isPending}>
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Add</>}
        </Button>
      </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function TrustMarksPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const { isFeatureEnabled } = useCapabilities();

  const showSelf = isFeatureEnabled('entity_configuration_trust_marks');
  const showFederation = isFeatureEnabled('federation_trust_marks');
  const showIssuance = isFeatureEnabled('trust_mark_issuance');

  const defaultTab = showSelf ? 'self' : showFederation ? 'types' : 'issuance';

  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to manage trust marks.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Trust Marks</h1>
          <p className="page-description">
            Manage trust marks for <span className="font-medium">{activeTrustAnchor.name}</span>
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-info/10 border border-info/30 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-info mt-0.5" />
        <div>
          <p className="font-medium text-info">Trust Mark Management</p>
          <p className="text-sm text-muted-foreground">
            <strong>My Trust Marks</strong> shows entity-config-level trust marks with JWT validity.
            <strong> Types / Owners / Issuers</strong> manage the federation-wide registry.
            <strong> Issuance</strong> controls which entities may receive each mark.
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          {showSelf && <TabsTrigger value="self">My Trust Marks</TabsTrigger>}
          {showFederation && <TabsTrigger value="types">Types</TabsTrigger>}
          {showFederation && <TabsTrigger value="owners">Owners</TabsTrigger>}
          {showFederation && <TabsTrigger value="issuers">Issuers</TabsTrigger>}
          {showIssuance && <TabsTrigger value="issuance">Issuance</TabsTrigger>}
        </TabsList>
        {showSelf && <TabsContent value="self"><SelfTrustMarksTab /></TabsContent>}
        {showFederation && <TabsContent value="types"><TrustMarkTypesTab /></TabsContent>}
        {showFederation && <TabsContent value="owners"><OwnersTab /></TabsContent>}
        {showFederation && <TabsContent value="issuers"><IssuersTab /></TabsContent>}
        {showIssuance && <TabsContent value="issuance"><IssuanceSpecsTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
