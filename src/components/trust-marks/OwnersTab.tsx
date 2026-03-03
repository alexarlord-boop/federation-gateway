import { useState } from 'react';
import { ChevronRight, Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTrustMarkOwners, useTrustMarkOwnerTypes } from '@/hooks/useTrustMarkOwners';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';

// ── Per-owner linked types row (mounted lazily inside expanded card) ──

function OwnerTypesRow({ ownerId }: { ownerId: number }) {
  const { types, isLoading, unlink } = useTrustMarkOwnerTypes(ownerId);
  const canManage = useOperationAllowed('federation_trust_marks', 'update');

  if (isLoading) {
    return <div className="py-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  if (types.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No trust mark types linked</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {types.map(t => (
        <Badge key={t.id as number} variant="secondary" className="gap-1 text-xs font-normal">
          <span className="font-mono max-w-[220px] truncate">{t.trust_mark_type}</span>
          {canManage && (
            <button
              onClick={() => unlink.mutate(t.id as any)}
              className="ml-0.5 hover:text-destructive leading-none"
              title="Unlink type"
            >
              ×
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────

export function OwnersTab() {
  const { owners, isLoading, error, create, remove } = useTrustMarkOwners();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('federation_trust_marks', 'create');
  const canDelete = useOperationAllowed('federation_trust_marks', 'delete');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEntityId, setNewEntityId] = useState('');
  const [newJwks, setNewJwks] = useState('');

  const handleCreate = async () => {
    if (!newEntityId || !newJwks) return;
    let jwks: object;
    try {
      jwks = JSON.parse(newJwks);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JWKS JSON' });
      return;
    }
    try {
      await create.mutateAsync({ entity_id: newEntityId as any, jwks: jwks as any });
      toast({ title: 'Owner created' });
      setNewEntityId(''); setNewJwks('');
      setIsAddOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create owner.' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Owners Unavailable</h3>
        <p className="text-muted-foreground text-sm">This feature may not be supported by the connected instance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trust mark owners define and govern trust mark types in the federation.
        </p>
        {canCreate && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Owner</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Trust Mark Owner</DialogTitle>
                <DialogDescription>Register a new trust mark owner entity.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Owner Entity ID</Label>
                  <Input
                    placeholder="https://owner.example.org"
                    value={newEntityId}
                    onChange={e => setNewEntityId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner JWKS (JSON)</Label>
                  <Textarea
                    placeholder={'{"keys": [...]}'}
                    value={newJwks}
                    onChange={e => setNewJwks(e.target.value)}
                    className="font-mono text-xs min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newEntityId || !newJwks || create.isPending}>
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Owners</h3>
          <p className="text-muted-foreground">No trust mark owners have been registered.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => {
            const id = (owner as any).id as number;
            const isExpanded = expandedId === id;
            return (
              <Card key={id}>
                <CardHeader
                  className="py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                      <div className="min-w-0">
                        <p className="font-mono text-sm truncate">{owner.entity_id}</p>
                        {owner.description && (
                          <p className="text-xs text-muted-foreground">{owner.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Owner?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the owner and all its trust mark type links.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove.mutate(id as any)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pt-3 pb-1">
                      Linked Trust Mark Types
                    </p>
                    <OwnerTypesRow ownerId={id} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
