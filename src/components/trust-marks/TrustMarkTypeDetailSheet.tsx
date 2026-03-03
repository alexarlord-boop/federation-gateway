import { useState } from 'react';
import { Edit2, Loader2, Plus, Shield, Tag, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTrustMarkTypeOwner } from '@/hooks/useTrustMarkTypeOwner';
import { useTrustMarkTypeIssuers } from '@/hooks/useTrustMarkTypeIssuers';
import { useOperationAllowed } from '@/hooks/useOperationAllowed';
import { useToast } from '@/hooks/use-toast';
import type { TrustMarkType } from '@/client/models/TrustMarkType';

interface Props {
  type: TrustMarkType;
  open: boolean;
  onClose: () => void;
}

export function TrustMarkTypeDetailSheet({ type, open, onClose }: Props) {
  const { toast } = useToast();
  const typeId = type.id as number;

  const {
    owner, isLoading: ownerLoading,
    create: createOwner, update: updateOwner, remove: removeOwner,
  } = useTrustMarkTypeOwner(typeId);

  const {
    issuers, isLoading: issuersLoading,
    add: addIssuer, remove: removeIssuer,
  } = useTrustMarkTypeIssuers(typeId);

  const canManage = useOperationAllowed('federation_trust_marks', 'update');

  const [ownerMode, setOwnerMode] = useState<'view' | 'edit'>('view');
  const [newOwnerEntityId, setNewOwnerEntityId] = useState('');
  const [newOwnerJwks, setNewOwnerJwks] = useState('');
  const [addIssuerInput, setAddIssuerInput] = useState('');

  const handleSetOwner = async () => {
    let jwks: object;
    try {
      jwks = JSON.parse(newOwnerJwks);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JWKS', description: 'JWKS must be valid JSON.' });
      return;
    }
    try {
      if (owner) {
        await updateOwner.mutateAsync({ entity_id: newOwnerEntityId as any, jwks: jwks as any });
      } else {
        await createOwner.mutateAsync({ entity_id: newOwnerEntityId as any, jwks: jwks as any });
      }
      toast({ title: owner ? 'Owner updated' : 'Owner assigned' });
      setOwnerMode('view');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to set owner.' });
    }
  };

  const handleAddIssuer = async () => {
    if (!addIssuerInput) return;
    try {
      await addIssuer.mutateAsync({ issuer: addIssuerInput } as any);
      toast({ title: 'Issuer added' });
      setAddIssuerInput('');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add issuer.' });
    }
  };

  const handleRemoveOwner = async () => {
    try {
      await removeOwner.mutateAsync();
      setOwnerMode('view');
      toast({ title: 'Owner removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove owner.' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Trust Mark Type
          </SheetTitle>
          <SheetDescription className="font-mono text-xs break-all">
            {type.trust_mark_type}
          </SheetDescription>
          {type.description && (
            <p className="text-sm text-muted-foreground pt-1">{type.description}</p>
          )}
        </SheetHeader>

        <div className="space-y-5">
          {/* Owner Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />Owner
                </CardTitle>
                {canManage && ownerMode === 'view' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOwnerMode('edit');
                      setNewOwnerEntityId(owner?.entity_id ?? '');
                      setNewOwnerJwks(owner ? JSON.stringify(owner.jwks, null, 2) : '');
                    }}
                  >
                    {owner ? <><Edit2 className="w-3 h-3 mr-1" />Edit</> : <><Plus className="w-3 h-3 mr-1" />Assign</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {ownerLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />Loading…
                </div>
              ) : ownerMode === 'edit' ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Owner Entity ID</Label>
                    <Input
                      value={newOwnerEntityId}
                      onChange={e => setNewOwnerEntityId(e.target.value)}
                      placeholder="https://owner.example.org"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Owner JWKS (JSON)</Label>
                    <Textarea
                      value={newOwnerJwks}
                      onChange={e => setNewOwnerJwks(e.target.value)}
                      placeholder={'{"keys": [...]}'}
                      className="font-mono text-xs min-h-[100px]"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={handleSetOwner}
                      disabled={createOwner.isPending || updateOwner.isPending}
                    >
                      {createOwner.isPending || updateOwner.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : 'Save'}
                    </Button>
                    {owner && (
                      <Button size="sm" variant="destructive" onClick={handleRemoveOwner} disabled={removeOwner.isPending}>
                        Remove Owner
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setOwnerMode('view')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : owner ? (
                <div className="space-y-1 text-sm">
                  <p className="font-mono text-xs break-all">{owner.entity_id}</p>
                  {owner.description && (
                    <p className="text-muted-foreground text-xs">{owner.description}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No owner assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Issuers Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />Issuers
                {!issuersLoading && (
                  <span className="text-muted-foreground font-normal">({issuers.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {issuersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />Loading…
                </div>
              ) : issuers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No issuers assigned</p>
              ) : (
                <div className="space-y-2">
                  {issuers.map(iss => (
                    <div
                      key={iss.id as number}
                      className="flex items-center justify-between bg-muted/40 rounded px-3 py-2"
                    >
                      <div>
                        <p className="font-mono text-xs break-all">{iss.issuer}</p>
                        {iss.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{iss.description}</p>
                        )}
                      </div>
                      {canManage && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Issuer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove <span className="font-mono">{iss.issuer}</span> from this trust mark type?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeIssuer.mutate(iss.id as number)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="https://issuer.example.org"
                    value={addIssuerInput}
                    onChange={e => setAddIssuerInput(e.target.value)}
                    className="flex-1 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleAddIssuer()}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddIssuer}
                    disabled={!addIssuerInput || addIssuer.isPending}
                  >
                    {addIssuer.isPending
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
