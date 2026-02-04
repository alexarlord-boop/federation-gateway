import { useState } from 'react';
import { Shield, Plus, ExternalLink, Settings, MoreHorizontal, ChevronUp, Server, Globe, ArrowDownToLine, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { cn } from '@/lib/utils';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useCreateSubordinate, useSubordinates } from '@/hooks/useSubordinates';
import { useAuthorityHints } from '@/hooks/useAuthorityHints';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const typeLabels: Record<string, { label: string; className: string }> = {
  federation: { label: 'Federation', className: 'bg-info/10 text-info border-info/30' },
  intermediate: { label: 'Intermediate', className: 'bg-accent/10 text-accent border-accent/30' },
  test: { label: 'Test', className: 'bg-warning/10 text-warning border-warning/30' },
  training: { label: 'Training', className: 'bg-muted text-muted-foreground border-muted' },
};

function TrustAnchorCard({ 
  ta, 
  isLocal = false, 
  isExternal = false,
  isSubordinate = false,
  isActive = false,
  onDelete,
}: { 
  ta: any; 
  isLocal?: boolean;
  isExternal?: boolean;
  isSubordinate?: boolean;
  isActive?: boolean;
  onDelete?: (id: string, label: string) => void;
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
              </div>
            </div>
          </div>
          {!isExternal && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Entity Config
                </DropdownMenuItem>
                {isLocal && onDelete && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(String(ta.id), ta.name || ta.entityId || ta.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
  const [entityId, setEntityId] = useState('');
  const [description, setDescription] = useState('');
  const { addHint } = useAuthorityHints();
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!entityId) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Entity ID is required' });
      return;
    }
    try {
      await addHint.mutateAsync({ entity_id: entityId, description });
      toast({ title: 'Superior TA Added', description: 'Authority hint configured successfully.' });
      setOpen(false);
      setEntityId('');
      setDescription('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not add authority hint' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-info hover:bg-info/90 text-info-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Superior TA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Superior Trust Anchor</DialogTitle>
          <DialogDescription>
            Add an upstream federation via authority hint. This configures which superior TAs this instance trusts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="entity-id">Superior Entity ID</Label>
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

function AddTrustAnchorDialog({ createTrustAnchor }: { createTrustAnchor: ReturnType<typeof useTrustAnchors>['createTrustAnchor'] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('federation');
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!name || !entityId) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Name and Entity ID are required' });
      return;
    }
    try {
      await createTrustAnchor.mutateAsync({
        name,
        entity_id: entityId,
        description: description || undefined,
        type,
        status: 'active',
      });
      toast({ title: 'TA Instance Added', description: 'Local trust anchor created successfully.' });
      setOpen(false);
      setName('');
      setEntityId('');
      setDescription('');
      setType('federation');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not add TA instance' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add TA Instance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Local Trust Anchor</DialogTitle>
          <DialogDescription>
            Register a new local trust anchor instance managed by this operator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="ta-name">Name</Label>
            <Input
              id="ta-name"
              placeholder="Local Federation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ta-entity-id">Entity ID</Label>
            <Input
              id="ta-entity-id"
              placeholder="https://ta.local.org"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ta-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="federation">Federation</SelectItem>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ta-description">Description (Optional)</Label>
            <Input
              id="ta-description"
              placeholder="Primary federation instance"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TrustAnchorsPage() {
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'ta' | 'subordinate' | 'hint'; id: string; label: string }
    | null
  >(null);
  // Sync the context state with the debug API
  const { data: currentCtxData } = useQuery({
    queryKey: ['debug-context'],
    queryFn: async () => {
        const res = await fetch('http://localhost:8765/api/debug/context');
        return res.json();
    }
  });

  // My-level TAs (static config from mock data)
  const { trustAnchors: allAnchors, isLoading: isLoadingMyTAs, createTrustAnchor, deleteTrustAnchor } = useTrustAnchors();
  const localTAs = allAnchors.filter(ta => ta.type === 'federation' || ta.type === 'test' || ta.type === 'training');

  // Superior TAs (via authority hints)
  const { hints: authorityHints, isLoading: isLoadingHints, deleteHint } = useAuthorityHints();

  // Subordinate TAs/IAs (federation_entity subordinates)
  const { data: subordinateTAs, isLoading: isLoadingSubTAs } = useSubordinates('federation_entity');

  // Determine active TA from debug context
  const activeTrustAnchor = allAnchors.find(ta => ta.id === currentCtxData?.contextId) || null;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      SubordinatesService.changeSubordinateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subordinates'] });
    },
  });
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

  const handleDeleteTrustAnchor = async (id: string) => {
    try {
      await deleteTrustAnchor.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Trust anchor removed.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete trust anchor.' });
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
    if (deleteTarget.kind === 'ta') {
      await handleDeleteTrustAnchor(deleteTarget.id);
    } else if (deleteTarget.kind === 'hint') {
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
        <h1 className="page-title">TAs and IAs</h1>
        <p className="page-description">
          Manage Trust Anchors and Intermediate Authorities
        </p>
      </div>

      {/* Level 1: My Level - Federation Instances */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">My Instances</h2>
            <span className="text-sm text-muted-foreground">(Configuration - Federation Operator Level)</span>
          </div>
          <AddTrustAnchorDialog createTrustAnchor={createTrustAnchor} />
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
                   onDelete={(id, label) => setDeleteTarget({ kind: 'ta', id, label })}
                 />
             );
          })}
        </div>
      </section>

      {/* Level 2: Superior Level - Upstream */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChevronUp className="w-5 h-5 text-info" />
            <h2 className="text-lg font-semibold">Superior Authorities</h2>
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
                        <CardTitle className="text-lg">{hint.description || 'External TA'}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="entity-badge border bg-info/10 text-info border-info/30">Federation</span>
                          <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">External</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
              <p>No superior authorities configured</p>
              <p className="text-sm">Add upstream TAs via "Add Trust Anchor" → "Link Superior TA"</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Level 3a: Subordinate TAs/Intermediates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold">Subordinate TAs & Intermediates</h2>
            <span className="text-sm text-muted-foreground">(Managed by Others - Registered Here)</span>
          </div>
          <Button className="bg-warning hover:bg-warning/90 text-warning-foreground" asChild>
            <Link to="/entities/register?type=intermediate">
              <Plus className="w-4 h-4 mr-2" />
              Register Intermediate
            </Link>
          </Button>
        </div>
        {subordinateTAs && subordinateTAs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subordinateTAs.map((ta) => (
              <Card key={ta.id} className="group hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-warning/10 group-hover:bg-warning/20 transition-colors">
                        <Shield className="w-6 h-6 text-warning" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{ta.description || ta.entity_id}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="entity-badge border bg-warning/10 text-warning border-warning/30">Intermediate</span>
                          <StatusBadge status={ta.status as any} />
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
              <p>No subordinate TAs or intermediates registered</p>
              <p className="text-sm">Register intermediate authorities using the "Register Intermediate" button above</p>
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
