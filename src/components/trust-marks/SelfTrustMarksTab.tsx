import { useState } from 'react';
import { Award, Edit2, Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useEntityConfigTrustMarks } from '@/hooks/useEntityConfigTrustMarks';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';
import {
  decodeTrustMarkJwt, formatExpiryRelative, getTrustMarkValidity,
} from '@/lib/jwt-utils';
import { ValidityBadge } from './ValidityBadge';
import { JwtDetailDialog } from './JwtDetailDialog';

export function SelfTrustMarksTab() {
  const { trustMarks, isLoading, error, create, update, remove } = useEntityConfigTrustMarks();
  const { toast } = useToast();
  const canCreate = useOperationAllowed('entity_configuration_trust_marks', 'create');
  const canDelete = useOperationAllowed('entity_configuration_trust_marks', 'delete');
  const canUpdate = useOperationAllowed('entity_configuration_trust_marks', 'update');

  const [addMode, setAddMode] = useState<'jwt' | 'manual'>('jwt');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [jwtInput, setJwtInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [issuerInput, setIssuerInput] = useState('');
  const [viewJwt, setViewJwt] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIssuer, setEditIssuer] = useState('');
  const [editJwt, setEditJwt] = useState('');

  const previewPayload = addMode === 'jwt' && jwtInput ? decodeTrustMarkJwt(jwtInput) : null;

  const handleAdd = async () => {
    try {
      if (addMode === 'jwt') {
        if (!jwtInput) return;
        await create.mutateAsync({ trust_mark: jwtInput });
      } else {
        if (!typeInput) return;
        await create.mutateAsync({
          trust_mark_type: typeInput,
          trust_mark_issuer: issuerInput || undefined,
        });
      }
      toast({ title: 'Trust mark added' });
      setJwtInput(''); setTypeInput(''); setIssuerInput('');
      setIsAddOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add trust mark' });
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await update.mutateAsync({
        id,
        data: {
          trust_mark_issuer: editIssuer || undefined,
          trust_mark: editJwt || undefined,
        },
      });
      toast({ title: 'Trust mark updated' });
      setEditingId(null);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update trust mark' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Trust mark removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove trust mark' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unavailable</h3>
        <p className="text-muted-foreground text-sm">
          Entity configuration trust marks could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trust marks published inside your own entity configuration statement.
        </p>
        {canCreate && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Trust Mark</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Trust Mark</DialogTitle>
                <DialogDescription>
                  Paste a signed Trust Mark JWT, or specify the type and issuer manually.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Mode toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(['jwt', 'manual'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setAddMode(m)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        addMode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {m === 'jwt' ? 'Paste JWT' : 'Type + Issuer'}
                    </button>
                  ))}
                </div>

                {addMode === 'jwt' ? (
                  <div className="space-y-2">
                    <Label>Trust Mark JWT</Label>
                    <Textarea
                      placeholder="eyJhbGci…"
                      value={jwtInput}
                      onChange={e => setJwtInput(e.target.value)}
                      className="font-mono text-xs min-h-[100px]"
                    />
                    {previewPayload && (
                      <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded">
                        {previewPayload.id && (
                          <div><span className="font-medium">Type: </span>{String(previewPayload.id)}</div>
                        )}
                        {previewPayload.iss && (
                          <div><span className="font-medium">Issuer: </span>{String(previewPayload.iss)}</div>
                        )}
                        {previewPayload.exp && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Validity:</span>
                            <ValidityBadge jwt={jwtInput} />
                            <span>{formatExpiryRelative(previewPayload.exp)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Trust Mark Type (URI)</Label>
                      <Input
                        placeholder="https://fed.example.org/trust-marks/member"
                        value={typeInput}
                        onChange={e => setTypeInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Issuer Entity ID (optional)</Label>
                      <Input
                        placeholder="https://tmi.example.org"
                        value={issuerInput}
                        onChange={e => setIssuerInput(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAdd}
                  disabled={create.isPending || (addMode === 'jwt' ? !jwtInput : !typeInput)}
                >
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {trustMarks.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trust Marks</h3>
          <p className="text-muted-foreground text-sm">
            Add the trust marks your entity has been issued and wishes to publish.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trust Mark Type</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustMarks.map(tm => {
                const payload = tm.trust_mark ? decodeTrustMarkJwt(tm.trust_mark) : null;
                const validity = getTrustMarkValidity(payload);
                const typeLabel = payload?.id ?? tm.trust_mark_type ?? '—';
                const issuerLabel = payload?.iss ?? tm.trust_mark_issuer ?? '—';

                if (editingId === (tm.id as number)) {
                  return (
                    <TableRow key={tm.id as number}>
                      <TableCell colSpan={4}>
                        <div className="space-y-2 py-1">
                          <Input
                            placeholder="Updated Issuer Entity ID"
                            value={editIssuer}
                            onChange={e => setEditIssuer(e.target.value)}
                          />
                          <Textarea
                            placeholder="Replacement Trust Mark JWT (optional)"
                            value={editJwt}
                            onChange={e => setEditJwt(e.target.value)}
                            className="font-mono text-xs min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdate(tm.id as number)} disabled={update.isPending}>
                              {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={tm.id as number}>
                    <TableCell
                      className="font-mono text-xs max-w-[240px] truncate"
                      title={String(typeLabel)}
                    >
                      {String(typeLabel)}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs max-w-[180px] truncate text-muted-foreground"
                      title={String(issuerLabel)}
                    >
                      {String(issuerLabel)}
                    </TableCell>
                    <TableCell><ValidityBadge status={validity} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payload?.exp
                        ? formatExpiryRelative(payload.exp)
                        : tm.trust_mark
                          ? '—'
                          : <span className="italic">JWT missing</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tm.trust_mark && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View decoded payload"
                            onClick={() => setViewJwt(tm.trust_mark!)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => {
                              setEditingId(tm.id as number);
                              setEditIssuer(tm.trust_mark_issuer ?? '');
                              setEditJwt('');
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Trust Mark?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove this trust mark from your entity configuration.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(tm.id as number)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {viewJwt && (
        <JwtDetailDialog jwt={viewJwt} open={true} onClose={() => setViewJwt(null)} />
      )}
    </div>
  );
}
