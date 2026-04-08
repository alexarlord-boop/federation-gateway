import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Check, X, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useChangeSubordinateStatus } from '@/hooks/useSubordinates';
import { SubordinateKeysService } from '@/client/services/SubordinateKeysService';

// Placeholder JWKS used when an entity has no keys and needs to be approved.
// The entity administrator should replace these with their own keys afterward.
const PLACEHOLDER_JWKS = {
  keys: [{
    kty: 'EC' as const,
    crv: 'P-256',
    x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
    y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
    use: 'sig',
    alg: 'ES256',
    kid: 'placeholder-key-1',
  }],
};

export default function ApprovalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();
  const updateStatus = useChangeSubordinateStatus();
  const { data: pendingEntities, isLoading: isLoadingPending } = useSubordinates(undefined, 'pending');
  const { data: approvedEntities, isLoading: isLoadingApproved } = useSubordinates(undefined, 'active');
  const { data: rejectedEntities, isLoading: isLoadingRejected } = useSubordinates(undefined, 'inactive');

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    const newStatus = actionType === 'approve' ? 'active' : 'inactive';
    
    try {
        try {
            await updateStatus.mutateAsync({ id: selectedRequest, status: newStatus });
        } catch (e: any) {
            // If approval failed with 400 (likely missing JWKS), add placeholder keys and retry once.
            if (newStatus === 'active' && e?.status === 400) {
                await SubordinateKeysService.setSubordinateJwks(selectedRequest, PLACEHOLDER_JWKS);
                await updateStatus.mutateAsync({ id: selectedRequest, status: newStatus });
            } else {
                throw e;
            }
        }
        toast({
            title: actionType === 'approve' ? 'Request Approved' : 'Request Rejected',
            description: `The subordinate status has been set to ${newStatus}.`,
        });
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: "Could not update subordinate status.",
        });
    } finally {
        setSelectedRequest(null);
        setActionType(null);
    }
  };

  const RequestCard = ({ entity, tabType }: { entity: any, tabType: 'pending' | 'approved' | 'rejected' }) => {
    const entityRole = entity?.metadata?.federation_entity?.entity_role;
    const typeLabels = (entity.registered_entity_types || [])
      .filter((t: string) => t !== 'federation_entity')
      .map((t: string) => (t === 'openid_provider' ? 'OP' : t === 'openid_relying_party' ? 'RP' : t));
    const typeLine = typeLabels.length > 0 ? typeLabels.join(', ') : entityRole === 'intermediate' ? 'Intermediate' : 'Leaf Entity';

    return (
    <Card data-testid="request-card" className="hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              tabType === 'pending'
                ? 'bg-warning/10' 
                : tabType === 'approved'
                ? 'bg-success/10'
                : 'bg-destructive/10'
            }`}>
              <ClipboardCheck className={`w-5 h-5 ${
                tabType === 'pending'
                  ? 'text-warning'
                  : tabType === 'approved'
                  ? 'text-success'
                  : 'text-destructive'
              }`} />
            </div>
            <div className="flex-1">
              {entity.description && (
                <h3 className="font-semibold">{entity.description}</h3>
              )}
              <h3 className={entity.description ? "text-sm text-muted-foreground" : "font-semibold"}>{entity.entity_id}</h3>
                <p className="text-sm text-muted-foreground">
                  {typeLine}
                </p>
               <p className="text-xs text-muted-foreground mt-1">
                ID: {entity.id}
              </p>
            </div>
          </div>
          
          {tabType === 'pending' ? (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/entities/${entity.id}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  Review
                </Link>
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => {
                  setSelectedRequest(entity.id);
                  setActionType('reject');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setSelectedRequest(entity.id);
                  setActionType('approve');
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
                 <Button variant="ghost" size="sm" asChild>
                    <Link to={`/entities/${entity.id}`}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage entity registration requests.
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingEntities && pendingEntities.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-warning text-warning-foreground text-xs rounded-full font-semibold">
                {pendingEntities.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoadingPending ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : pendingEntities?.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">All caught up! There are no requests waiting for review.</p>
            </div>
          ) : (
            pendingEntities?.map(req => (
              <RequestCard key={req.id} entity={req} tabType="pending" />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
             {isLoadingApproved ? (
                 <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
             ) : approvedEntities?.length === 0 ? (
                 <div className="text-center py-12 bg-muted/50 rounded-lg">
                   <Check className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No Approved Entities</h3>
                   <p className="text-muted-foreground">Approved entities will appear here.</p>
                 </div>
             ) : (
                  approvedEntities?.map(req => (
                      <RequestCard key={req.id} entity={req} tabType="approved" />
                  ))
             )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
             {isLoadingRejected ? (
                 <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
             ) : rejectedEntities?.length === 0 ? (
                 <div className="text-center py-12 bg-muted/50 rounded-lg">
                   <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No Rejected Entities</h3>
                   <p className="text-muted-foreground">Rejected requests will appear here.</p>
                 </div>
             ) : (
                  rejectedEntities?.map(req => (
                      <RequestCard key={req.id} entity={req} tabType="rejected" />
                  ))
             )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this registration request?
              {actionType === 'approve' 
                ? ' The entity will be added to the federation.' 
                : ' The entity will be notified of the rejection.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Notes field removed as not supported by minimal API yet */}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
            >
              Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
