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
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { cn } from '@/lib/utils';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useCreateSubordinate, useSubordinates } from '@/hooks/useSubordinates';
import { useAuthorityHints } from '@/hooks/useAuthorityHints';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  isActive = false 
}: { 
  ta: any; 
  isLocal?: boolean;
  isExternal?: boolean;
  isSubordinate?: boolean;
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

function AddTrustAnchorDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'local' | 'superior' | null>(null);
  const [superiorEntityId, setSuperiorEntityId] = useState('');
  const [superiorDescription, setSuperiorDescription] = useState('');
  const createSubordinate = useCreateSubordinate();
  const { addHint } = useAuthorityHints();
  const { toast } = useToast();

  const handleCreateLocal = async () => {
    try {
        await createSubordinate.mutateAsync({
            // Mock payload for a new TA
            entity_id: 'https://new-federation.example.org',
            registered_entity_types: ['federation_entity'],
            status: 'active',
            metadata: {
                federation_entity: {
                    organization_name: 'New Local Federation'
                }
            }
        } as any);
        toast({
            title: "Success",
            description: "New Trust Anchor created successfully",
        });
        setOpen(false);
        setMode(null);
    } catch (e) {
        toast({
            title: "Error",
            description: "Failed to create Trust Anchor",
            variant: "destructive"
        });
    }
  };

  const handleAddSuperior = async () => {
    if (!superiorEntityId) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Entity ID is required' });
      return;
    }
    try {
      await addHint.mutateAsync({ entity_id: superiorEntityId, description: superiorDescription });
      toast({ title: 'Superior TA Added', description: 'Authority hint configured successfully.' });
      setOpen(false);
      setMode(null);
      setSuperiorEntityId('');
      setSuperiorDescription('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not add authority hint' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Trust Anchor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Trust Anchor</DialogTitle>
          <DialogDescription>
            {!mode ? 'Choose how you want to add a new Trust Anchor to the registry.' : mode === 'local' ? 'Deploy a new local TA instance' : 'Add a superior TA via authority hint'}
          </DialogDescription>
        </DialogHeader>
        {!mode ? (
          <div className="grid gap-4 py-4">
            <button 
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-left group"
              onClick={() => setMode('local')}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                <Server className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-accent transition-colors">Deploy Local Instance</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Spin up a new local signer/registry that you manage. Full CRUD access.
                </p>
              </div>
            </button>
            
            <button 
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-info hover:bg-info/5 transition-colors text-left group"
              onClick={() => setMode('superior')}
            >
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors shrink-0">
                <Globe className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-info transition-colors">Link Superior TA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add upstream federation via authority hint. Read-only reference.
                </p>
              </div>
            </button>
          </div>
        ) : mode === 'local' ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">This will create a new federation_entity subordinate that acts as a local TA instance you can manage.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
              <Button onClick={handleCreateLocal}>Create Local TA</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="superior-entity-id">Superior Entity ID</Label>
              <Input 
                id="superior-entity-id"
                placeholder="https://edugain.org"
                value={superiorEntityId}
                onChange={(e) => setSuperiorEntityId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="superior-description">Description (Optional)</Label>
              <Input 
                id="superior-description"
                placeholder="eduGAIN Interfederation"
                value={superiorDescription}
                onChange={(e) => setSuperiorDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
              <Button onClick={handleAddSuperior}>Add Authority Hint</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TrustAnchorsPage() {
  // Sync the context state with the debug API
  const { data: currentCtxData } = useQuery({
    queryKey: ['debug-context'],
    queryFn: async () => {
        const res = await fetch('http://localhost:8765/api/debug/context');
        return res.json();
    }
  });

  // My-level TAs (static config from mock data)
  const { trustAnchors: allAnchors, isLoading: isLoadingMyTAs } = useTrustAnchors();
  const localTAs = allAnchors.filter(ta => ta.type === 'federation' || ta.type === 'test' || ta.type === 'training');

  // Superior TAs (via authority hints)
  const { hints: authorityHints, isLoading: isLoadingHints, deleteHint } = useAuthorityHints();

  // Subordinate TAs/IAs (federation_entity subordinates)
  const { data: subordinateTAs, isLoading: isLoadingSubTAs } = useSubordinates('federation_entity');

  // Determine active TA from debug context
  const activeTrustAnchor = allAnchors.find(ta => ta.id === currentCtxData?.contextId) || null;

  const { toast } = useToast();

  const handleDeleteHint = async (id: string) => {
    try {
      await deleteHint.mutateAsync(id);
      toast({ title: 'Removed', description: 'Authority hint deleted successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not delete authority hint' });
    }
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
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">TAs and IAs</h1>
          <p className="page-description">
            Manage Trust Anchors and Intermediate Authorities
          </p>
        </div>
        <AddTrustAnchorDialog />
      </div>

      {/* Level 1: My Level - Local Instances */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">My Instances</h2>
          <span className="text-sm text-muted-foreground">(Local - Full CRUD)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localTAs.map((ta) => {
             const isActive = activeTrustAnchor?.id === ta.id;
             return (
                <TrustAnchorCard key={ta.id} ta={ta} isLocal isActive={isActive} />
             );
          })}
        </div>
      </section>

      {/* Level 2: Superior Level - Upstream */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ChevronUp className="w-5 h-5 text-info" />
          <h2 className="text-lg font-semibold">Superior Authorities</h2>
          <span className="text-sm text-muted-foreground">(Upstream - Read Only)</span>
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
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteHint(hint.id.toString())}>
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
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold">Subordinate TAs & Intermediates</h2>
          <span className="text-sm text-muted-foreground">(Downstream - Full CRUD)</span>
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
              <p>No subordinate TAs configured</p>
              <p className="text-sm">Use "Add Trust Anchor" → "Deploy Local Instance" or register via /entities</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
