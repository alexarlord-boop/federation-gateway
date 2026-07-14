import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTrustMarkSpecs } from '@/hooks/useTrustMarkIssuance';
import { TrustMarkIssuanceService } from '@/client/services/TrustMarkIssuanceService';

interface Props {
  /** Custom trigger element. Defaults to a standalone "Issue Trust Mark" button. */
  trigger?: React.ReactNode;
  /** Pre-fills and locks the entity ID field — used when issuing from a known entity's own page. */
  lockedEntityId?: string;
  onSuccess?: () => void;
}

/**
 * Issues a trust mark to an entity by picking one of this instance's own
 * issuance specs (Trust Marks → Issuance). This is the *issuer* role's
 * action — see TrustMarksPage's role legend.
 *
 * Reusable: the Trust Marks page uses it standalone; entity detail pages
 * use it with `lockedEntityId` so operators don't have to navigate away to
 * issue a mark to the entity they're already looking at.
 */
export function IssueTrustMarkDialog({ trigger, lockedEntityId, onSuccess }: Props) {
  const { specs } = useTrustMarkSpecs();
  const [open, setOpen] = useState(false);
  const [specId, setSpecId] = useState('');
  const [entityId, setEntityId] = useState(lockedEntityId ?? '');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleIssue = async () => {
    if (!specId || !entityId) return;
    setIsPending(true);
    try {
      await TrustMarkIssuanceService.createTrustMarkSubject(Number(specId), { entity_id: entityId, status: 'active' });
      queryClient.invalidateQueries({ queryKey: ['trust-mark-subjects'] });
      toast({ title: 'Issued', description: `Trust mark issued to ${entityId}` });
      if (!lockedEntityId) setEntityId('');
      setSpecId('');
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      const detail = err?.body?.detail ?? err?.message ?? 'Failed to issue trust mark';
      toast({ variant: 'destructive', title: 'Error', description: String(detail) });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Send className="w-4 h-4 mr-2" />Issue to Entity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Trust Mark{lockedEntityId ? ' to This Entity' : ''}</DialogTitle>
          <DialogDescription>
            {lockedEntityId
              ? 'Select an issuance spec to grant this entity a trust mark.'
              : 'Select an issuance spec and enter the entity ID to grant it a trust mark.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="issue-spec">Trust Mark Spec <span className="text-destructive">*</span></Label>
            {specs.length === 0 ? (
              <Select disabled>
                <SelectTrigger id="issue-spec">
                  <SelectValue placeholder="No specs configured — add one first" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            ) : (
              <Select value={specId} onValueChange={setSpecId}>
                <SelectTrigger id="issue-spec">
                  <SelectValue placeholder="Select a trust mark spec…" />
                </SelectTrigger>
                <SelectContent>
                  {specs.map((s) => (
                    <SelectItem key={s.id as number} value={String(s.id)}>
                      {s.trust_mark_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-entity">Entity ID <span className="text-destructive">*</span></Label>
            <Input
              id="issue-entity"
              placeholder="https://entity.example.org"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              disabled={!!lockedEntityId}
              className={lockedEntityId ? 'font-mono text-xs' : undefined}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleIssue} disabled={!specId || !entityId || isPending || specs.length === 0}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
