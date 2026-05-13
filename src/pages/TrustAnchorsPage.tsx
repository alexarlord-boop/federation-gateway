import { useState } from 'react';
import { Shield, Plus, ExternalLink, MoreHorizontal, ArrowUpToLine, Server, Globe, ArrowDownToLine, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useDebugContext } from '@/hooks/useDebugContext';
import { useSubordinates, useChangeSubordinateStatus } from '@/hooks/useSubordinates';
import { useAuthorityHints } from '@/hooks/useAuthorityHints';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { useBackend } from '@/contexts/BackendContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const typeLabels: Record<string, { label: string; className: string }> = {
  federation: { label: 'Federation', className: 'badge-cta' },
  intermediate: { label: 'Intermediate', className: 'badge-cta' },
  test: { label: 'Test', className: 'badge-cta' },
  training: { label: 'Training', className: 'badge-cta' },
};

function TrustAnchorCard({ 
  ta, 
  isLocal = false, 
  isExternal = false,
  isActive = false,
}: { 
  ta: any; 
  isLocal?: boolean;
  isExternal?: boolean;
  isActive?: boolean;
}) {
  const typeConfig = typeLabels[ta.type];

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all",
      isActive && "ring-2 ring-primary",
      isExternal && "opacity-75 bg-muted/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors",
              isExternal ? "bg-muted" : "bg-accent/10"
            )}>
              <Shield className={cn("w-6 h-6", isExternal ? "text-muted-foreground" : "text-accent")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{ta.name}</CardTitle>
                {ta.status === 'active' && isLocal && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="In Operation" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`entity-badge border ${typeConfig.className}`}>
                  {typeConfig.label}
                </span>
                {isExternal && (
                  <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">
                    External
                  </span>
                )}
                {ta.deploymentManaged && (
                  <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">
                    Deployment managed
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </CardHeader>
      <CardContent>
        {ta.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {ta.description}
          </p>
        )}
        
        {!isExternal && ta.subordinateCount !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Subordinates</p>
              <p className="text-2xl font-bold">{ta.subordinateCount}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              ta.status === 'active' 
                ? 'bg-success/10 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {ta.status}
            </div>
          </div>
        )}

        <div className={cn("pt-4 border-t", !isExternal && ta.subordinateCount !== undefined ? "mt-4" : "mt-0")}>
          <p className="text-xs text-muted-foreground truncate font-mono">
            {ta.entityId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddAuthorityHintDialog() {
  const [open, setOpen] = useState(false);
  const [entityId, setEntityId] = useState('https://edugain.org');
  const [description, setDescription] = useState('eduGAIN Interfederation');
  const { addHint } = useAuthorityHints();
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!entityId) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Entity ID is required' });
      return;
    }
    try {
      await addHint.mutateAsync({ entity_id: entityId, description });
      toast({ title: 'Authority Hint Added', description: 'Authority hint configured successfully.' });
      setOpen(false);
      setEntityId('');
      setDescription('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not add authority hint' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          if (!entityId) setEntityId('https://edugain.org');
          if (!description) setDescription('eduGAIN Interfederation');
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Authority Hint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Authority Hint</DialogTitle>
          <DialogDescription>
            Add an upstream federation via an authority hint. This configures which upstream authorities this instance trusts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="entity-id">Authority Hint Entity ID</Label>
            <Input 
              id="entity-id"
              placeholder="https://edugain.org"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input 
              id="description"
              placeholder="eduGAIN Interfederation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Authority Hint</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TrustAnchorsPage() {
  const { selectedBackend } = useBackend();
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'hint' | 'subordinate'; id: string; label: string }
    | null
  >(null);

  const { context: currentCtxData } = useDebugContext(selectedBackend.id, selectedBackend.baseUrl);

  const { trustAnchors: allAnchors, isLoading: isLoadingMyTAs } = useTrustAnchors();
  const localTAs = allAnchors.filter(ta => ta.type === 'federation' || ta.type === 'intermediate');

  const { hints: authorityHints, isLoading: isLoadingHints, deleteHint } = useAuthorityHints();

  // Subordinate TAs/IAs (federation_entity subordinates)
  const { data: subordinateTAs, isLoading: isLoadingSubTAs } = useSubordinates('federation_entity');
  const intermediateTAs = (subordinateTAs || []).filter(
    (ta: any) => ta?.metadata?.federation_entity?.entity_role === 'intermediate'
  );

  // Determine active TA from debug context
  const activeTrustAnchor = allAnchors.find(ta => ta.id === currentCtxData?.contextId) || null;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useChangeSubordinateStatus();
  const deleteSubordinate = useMutation({
    mutationFn: (id: string) => SubordinatesService.deleteSubordinate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subordinates'] });
    },
  });

  const handleDeleteHint = async (id: string) => {
    try {
      await deleteHint.mutateAsync(id);
      toast({ title: 'Removed', description: 'Authority hint deleted successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not delete authority hint' });
    }
  };

  const handleDeleteSubordinate = async (id: string) => {
    try {
      await deleteSubordinate.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Subordinate removed.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete subordinate.' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'hint') {
      await handleDeleteHint(deleteTarget.id);
    } else {
      await handleDeleteSubordinate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const isLoading = isLoadingMyTAs || isLoadingHints || isLoadingSubTAs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-8">
        <h1 className="page-title">Authority Hints and Trust Anchors</h1>
        <p className="page-description">
          Review deployment-managed instances, authority hints, and registered intermediates.
        </p>
      </div>

      {/* Level 1: My Level - Federation Instances */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">My Instances</h2>
            <span className="text-sm text-muted-foreground">(Deployment-managed configuration)</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localTAs.map((ta) => {
             const isActive = activeTrustAnchor?.id === ta.id;
             return (
                 <TrustAnchorCard
                   key={ta.id}
                   ta={ta}
                   isLocal
                   isActive={isActive}
                 />
             );
          })}
        </div>
      </section>

      {/* Level 2: Authority Hints - Upstream */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpToLine className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Authority Hints</h2>
            <span className="text-sm text-muted-foreground">(Upstream - Read Only)</span>
          </div>
          <AddAuthorityHintDialog />
        </div>
        {authorityHints && authorityHints.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorityHints.map((hint) => (
              <Card key={hint.id} className="group hover:shadow-md transition-all opacity-75 bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
                        <Shield className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{hint.description || 'Upstream Authority'}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="entity-badge border bg-info/10 text-info border-info/30">Federation</span>
                          <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">External</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Authority hint options">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'hint',
                              id: hint.id.toString(),
                              label: hint.description || hint.entity_id,
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Authority Hint
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground font-mono truncate">{hint.entity_id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No authority hints configured</p>
              <p className="text-sm">Add upstream authorities via the "Add Authority Hint" button.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Level 3a: Registered intermediates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Registered Intermediates</h2>
            <span className="text-sm text-muted-foreground">(Managed as subordinates)</span>
          </div>
        </div>
        {intermediateTAs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {intermediateTAs.map((ta) => (
              <Card key={ta.id} className="group hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{ta.description || ta.entity_id}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="entity-badge border badge-cta">Intermediate</span>
                          <StatusBadge status={ta.status as any} />
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Intermediate trust anchor options">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/entities/${ta.id}`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: String(ta.id), status: 'pending' })}>
                          Set Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: String(ta.id), status: 'active' })}>
                          Set Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: String(ta.id), status: 'rejected' })}>
                          Set Rejected
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'subordinate',
                              id: String(ta.id),
                              label: ta.description || ta.entity_id || String(ta.id),
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground font-mono truncate">{ta.entity_id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Server className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No intermediates registered</p>
              <p className="text-sm">Register new intermediates from the Subordinates navigation.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently delete "${deleteTarget.label}". This action cannot be undone.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
