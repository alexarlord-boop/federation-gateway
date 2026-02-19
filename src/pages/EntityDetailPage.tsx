import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  ExternalLink, 
  Copy, 
  User,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Key,
  Shield,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTypeBadge } from '@/components/ui/entity-type-badge';
import { useToast } from '@/hooks/use-toast';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import { useSubordinateConstraints } from '@/hooks/useSubordinateConstraints';
import { useSubordinateKeys } from '@/hooks/useSubordinateKeys';
import { useSubordinateMetadataPolicies } from '@/hooks/useSubordinateMetadataPolicies';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

/* ─── Subordinate Constraints Tab ─── */
function SubordinateConstraintsTab({ subordinateId }: { subordinateId: string }) {
  const { toast } = useToast();
  const {
    constraints, isLoading, error,
    copyFromGeneral, deleteAll,
    setMaxPathLength, deleteMaxPathLength,
    addAllowedEntityType, deleteAllowedEntityType,
  } = useSubordinateConstraints(subordinateId);

  const [newMaxPath, setNewMaxPath] = useState('');
  const [newEntityType, setNewEntityType] = useState('');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <Card><CardContent className="py-8 text-center text-muted-foreground">Failed to load constraints</CardContent></Card>;

  const maxPath = constraints?.max_path_length;
  const naming = constraints?.naming_constraints;
  const allowed: string[] = (constraints as any)?.allowed_entity_types ?? [];

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyFromGeneral.mutateAsync().then(() =>
            toast({ title: 'Copied', description: 'General constraints applied to this subordinate' }))
            .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Copy failed' }))}
          disabled={copyFromGeneral.isPending}
        >
          {copyFromGeneral.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
          Copy from General
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteAll.mutateAsync().then(() =>
            toast({ title: 'Cleared', description: 'All constraints removed' }))
            .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Delete failed' }))}
          disabled={deleteAll.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Path Length */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Max Path Length</CardTitle>
            <CardDescription>Maximum depth of the trust chain below this subordinate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-mono">{maxPath != null ? maxPath : <span className="text-muted-foreground text-base">Not set</span>}</p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 2"
                value={newMaxPath}
                onChange={e => setNewMaxPath(e.target.value)}
                className="w-24"
              />
              <Button
                size="sm"
                disabled={!newMaxPath || setMaxPathLength.isPending}
                onClick={() => setMaxPathLength.mutateAsync(Number(newMaxPath)).then(() => { setNewMaxPath(''); toast({ title: 'Updated' }); })}
              >
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
          <CardDescription>Entity types this subordinate may register as</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowed.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allowed.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    onClick={() => deleteAllowedEntityType.mutateAsync(t)}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No restrictions — all types allowed</p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="openid_relying_party"
              value={newEntityType}
              onChange={e => setNewEntityType(e.target.value)}
              className="max-w-xs"
            />
            <Button
              size="sm"
              disabled={!newEntityType.trim() || addAllowedEntityType.isPending}
              onClick={() => addAllowedEntityType.mutateAsync(newEntityType.trim()).then(() => { setNewEntityType(''); toast({ title: 'Added' }); })}
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Subordinate Metadata Policies Tab ─── */
function SubordinateMetadataPoliciesTab({ subordinateId }: { subordinateId: string }) {
  const { toast } = useToast();
  const {
    policies, isLoading, error,
    copyFromGeneral, deleteAll, updateAll,
  } = useSubordinateMetadataPolicies(subordinateId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <Card><CardContent className="py-8 text-center text-muted-foreground">Failed to load metadata policies</CardContent></Card>;

  const policyEntries = Object.entries(policies as Record<string, any>);

  const startEdit = () => {
    setDraft(JSON.stringify(policies, null, 2));
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      const parsed = JSON.parse(draft);
      await updateAll.mutateAsync(parsed);
      setEditing(false);
      toast({ title: 'Saved', description: 'Metadata policies updated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message ?? 'Invalid JSON or save failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyFromGeneral.mutateAsync().then(() =>
            toast({ title: 'Copied', description: 'General policies applied to this subordinate' }))
            .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Copy failed' }))}
          disabled={copyFromGeneral.isPending}
        >
          {copyFromGeneral.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Copy from General
        </Button>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            Edit JSON
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteAll.mutateAsync().then(() =>
            toast({ title: 'Cleared', description: 'All metadata policies removed' }))
            .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Delete failed' }))}
          disabled={deleteAll.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear All
        </Button>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Metadata Policies (JSON)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              className="font-mono text-xs min-h-[300px]"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={updateAll.isPending}>
                {updateAll.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save
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
                    <TableRow>
                      <TableHead>Claim</TableHead>
                      <TableHead>Operators</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(claims as Record<string, any>).map(([claim, operators]) => (
                      <TableRow key={claim}>
                        <TableCell className="font-mono text-sm">{claim}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(operators as Record<string, any>).map(([op, val]) => (
                              <Badge key={op} variant="outline" className="text-xs">
                                {op}: {JSON.stringify(val)}
                              </Badge>
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
            <p className="text-muted-foreground">No metadata policies configured for this subordinate</p>
            <p className="text-sm text-muted-foreground mt-1">Use "Copy from General" to inherit federation-wide policies</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { entity, isLoading, error, updateStatus, deleteSubordinate } = useEntityDetail(id!);
  const canUpdate = useOperationAllowed('subordinates', 'update');
  const canDelete = useOperationAllowed('subordinates', 'delete');

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Entity Not Found</h2>
        <p className="text-muted-foreground mb-4">The entity you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/entities">Back to Entities</Link>
        </Button>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };
  
  const handleStatusChange = async (status: string) => {
      try {
        await updateStatus.mutateAsync(status);
        toast({ title: "Status Updated", description: `Entity status set to ${status}` });
      } catch (e) {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update status" });
      }
  };

  const handleDelete = async () => {
    try {
        await deleteSubordinate.mutateAsync();
        toast({ title: "Entity Deleted", description: "The entity has been removed." });
        navigate('/entities');
    } catch (e) {
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete entity" });
    }
  };

  // Helper getters - handle mock db structure safely
  const getMetadata = () => entity.metadata || {};
  const getOpMetadata = () => (getMetadata() as any).openid_provider || {};
  const getFedMetadata = () => (getMetadata() as any).federation_entity || {};
  
  const entityDescription = (entity as any).description as string | undefined;
  const displayName = entityDescription
    || getOpMetadata().client_name
    || getOpMetadata().organization_name
    || getFedMetadata().organization_name
    || entity.entity_id;
  const organizationName = getOpMetadata().organization_name || getFedMetadata().organization_name || displayName || '—';
  const contacts = getOpMetadata().contacts || getFedMetadata().contacts || [];
  const homepage = getOpMetadata().client_uri || getOpMetadata().homepage_uri || getFedMetadata().homepage_uri;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/entities" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Entities
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">
                  {displayName}
                </h1>
                <StatusBadge status={entity.status as any} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-mono">{entity.entity_id}</span>
                <button 
                  onClick={() => copyToClipboard(entity.entity_id, 'Entity ID')}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {entity.registered_entity_types?.map((type) => (
                  <EntityTypeBadge key={type} type={type as any} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Only show operational toggle for approved entities when user can update */}
            {canUpdate && (entity.status === 'active' || entity.status === 'locked') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                     {entity.status === 'locked' ? 'Unlock' : 'Lock'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                   <DropdownMenuLabel>Operational Status</DropdownMenuLabel>
                   <DropdownMenuItem 
                     onClick={() => handleStatusChange(entity.status === 'locked' ? 'active' : 'locked')}
                     disabled={entity.status !== 'active' && entity.status !== 'locked'}
                   >
                      {entity.status === 'locked' ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2 text-success" /> Unlock (Set Active)</>
                      ) : (
                        <><XCircle className="w-4 h-4 mr-2 text-warning" /> Lock (Suspend Operations)</>
                      )}
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="outline" asChild>
              <a href={`${entity.entity_id}/.well-known/openid-federation`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                Config
              </a>
            </Button>
            
            {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                    <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the entity
                    and remove its data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="jwks">JWKS</TabsTrigger>
          <TabsTrigger value="constraints">Constraints</TabsTrigger>
          <TabsTrigger value="policies">Metadata Policies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Entity Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organization</p>
                    <p className="mt-1">{organizationName}</p>
                  </div>
                  {entityDescription && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                      <p className="mt-1">{entityDescription}</p>
                    </div>
                  )}
                </div>

                {homepage && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Homepage</p>
                    <a 
                      href={homepage} 
                      target="_blank" 
                      rel="noopener"
                      className="mt-1 text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {homepage}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contacts.map((contact: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                             {typeof contact === 'string' ? (
                                <a href={`mailto:${contact}`} className="text-sm text-accent hover:underline">{contact}</a>
                             ) : (
                                 <p className="text-sm">{contact.email ? contact.email : JSON.stringify(contact)}</p>
                             )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contacts configured</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="metadata">
            <Card>
                <CardHeader><CardTitle>Metadata JSON</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                        <pre className="text-xs font-mono">{JSON.stringify(entity.metadata, null, 2)}</pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="jwks">
             <Card>
                <CardHeader><CardTitle>Public Keys (JWKS)</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                        <pre className="text-xs font-mono">{JSON.stringify(entity.jwks, null, 2)}</pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="constraints">
          <SubordinateConstraintsTab subordinateId={id!} />
        </TabsContent>

        <TabsContent value="policies">
          <SubordinateMetadataPoliciesTab subordinateId={id!} />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
