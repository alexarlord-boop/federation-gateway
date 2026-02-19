import { useState } from 'react';
import { Award, Info, Loader2, Plus, Trash2, ChevronRight, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';

// ── Trust Mark Types Tab ────────────────────────────────

function TrustMarkTypesTab() {
  const { trustMarkTypes, isLoading, error, create, remove } = useTrustMarkTypes();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState('');

  const handleCreate = async () => {
    if (!newType) return;
    try {
      await create.mutateAsync({ trust_mark_type: newType });
      toast({ title: 'Created', description: 'Trust mark type added' });
      setNewType('');
      setIsCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create trust mark type' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Trust mark type removed' });
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newType || create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Trust Mark Issuance Specs Tab ───────────────────────

function IssuanceSpecsTab() {
  const { specs, isLoading, error, create, remove } = useTrustMarkSpecs();
  const { toast } = useToast();
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newSpecType || create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    {spec.lifetime && <Badge variant="outline">{spec.lifetime}s lifetime</Badge>}
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
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => changeStatus.mutate({ subjectId: sub.id as number, status: sub.status === 'active' ? 'suspended' : 'active' })}>
                    {sub.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(sub.id as number)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex gap-2">
        <Input placeholder="https://entity.example.org" value={newEntityId} onChange={(e) => setNewEntityId(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={handleAdd} disabled={!newEntityId || create.isPending}>
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Add</>}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function TrustMarksPage() {
  const { activeTrustAnchor } = useTrustAnchor();

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
            Manage trust mark types and issuance for <span className="font-medium">{activeTrustAnchor.name}</span>
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-info/10 border border-info/30 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-info mt-0.5" />
        <div>
          <p className="font-medium text-info">Trust Mark Management</p>
          <p className="text-sm text-muted-foreground">
            Trust marks indicate compliance with specific policies. <strong>Types</strong> define what
            marks exist. <strong>Issuance Specs</strong> control who can receive them.
          </p>
        </div>
      </div>

      <Tabs defaultValue="types" className="space-y-6">
        <TabsList>
          <TabsTrigger value="types">Trust Mark Types</TabsTrigger>
          <TabsTrigger value="issuance">Issuance Specs</TabsTrigger>
        </TabsList>
        <TabsContent value="types"><TrustMarkTypesTab /></TabsContent>
        <TabsContent value="issuance"><IssuanceSpecsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
