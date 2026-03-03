import { useState } from 'react';
import { ChevronRight, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTrustMarkIssuers, useTrustMarkIssuerTypes } from '@/hooks/useTrustMarkIssuers';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';

// ── Per-issuer linked types row (mounted lazily inside expanded card) ──

function IssuerTypesRow({ issuerId }: { issuerId: number }) {
  const { types, isLoading, unlink } = useTrustMarkIssuerTypes(issuerId);
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

export function IssuersTab() {
  const { issuers, isLoading, error, create, remove } = useTrustMarkIssuers();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('federation_trust_marks', 'create');
  const canDelete = useOperationAllowed('federation_trust_marks', 'delete');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIssuer, setNewIssuer] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    if (!newIssuer) return;
    try {
      await create.mutateAsync({ issuer: newIssuer, description: newDesc || undefined });
      toast({ title: 'Issuer created' });
      setNewIssuer(''); setNewDesc('');
      setIsAddOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create issuer.' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Issuers Unavailable</h3>
        <p className="text-muted-foreground text-sm">This feature may not be supported by the connected instance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trust mark issuers are entities authorized to evaluate subjects and issue trust marks.
        </p>
        {canCreate && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Issuer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Trust Mark Issuer</DialogTitle>
                <DialogDescription>Register a new trust mark issuer entity.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Issuer Entity ID</Label>
                  <Input
                    placeholder="https://tmi.example.org"
                    value={newIssuer}
                    onChange={e => setNewIssuer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Short description of this issuer"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newIssuer || create.isPending}>
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {issuers.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Issuers</h3>
          <p className="text-muted-foreground">No trust mark issuers have been registered.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issuers.map(iss => {
            const id = iss.id as number;
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
                        <p className="font-mono text-sm truncate">{iss.issuer}</p>
                        {iss.description && (
                          <p className="text-xs text-muted-foreground">{iss.description}</p>
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
                              <AlertDialogTitle>Delete Issuer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the issuer and all its trust mark type links.
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
                    <IssuerTypesRow issuerId={id} />
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
