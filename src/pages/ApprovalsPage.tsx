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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';

export default function ApprovalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch lists
  const { data: pendingEntities, isLoading: isLoadingPending } = useSubordinates(undefined, 'pending');
  // Ideally we fetch 'history' or 'all' for completed tabs, but let's just show active for 'Approved'
  const { data: activeEntities, isLoading: isLoadingActive } = useSubordinates(undefined, 'active');

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
        SubordinatesService.changeSubordinateStatus(id, { status }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['subordinates'] });
    }
  });

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    const newStatus = actionType === 'approve' ? 'active' : 'rejected';
    
    try {
        await updateStatus.mutateAsync({ id: selectedRequest, status: newStatus });
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

  const RequestCard = ({ entity, isPending }: { entity: any, isPending: boolean }) => (
    <Card className="hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              entity.status === 'pending' 
                ? 'bg-yellow-500/10' 
                : entity.status === 'active'
                ? 'bg-green-500/10'
                : 'bg-red-500/10'
            }`}>
              <ClipboardCheck className={`w-5 h-5 ${
                entity.status === 'pending'
                  ? 'text-yellow-600'
                  : entity.status === 'active'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold">{entity.entity_id}</h3>
              <p className="text-sm text-muted-foreground">
                 {(entity.registered_entity_types || []).join(', ')}
              </p>
               <p className="text-xs text-muted-foreground mt-1">
                ID: {entity.id}
              </p>
            </div>
          </div>
          
          {isPending ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/entities/${entity.id}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  Review
                </Link>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
            <div className="flex items-center gap-2">
                <span className={`text-sm px-2 py-1 rounded-full ${
                    entity.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {entity.status}
                </span>
                 <Button variant="ghost" size="sm" asChild>
                    <Link to={`/entities/${entity.id}`}>
                    <Eye className="w-4 h-4" />
                    </Link>
                </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
            Pending Requests
            {pendingEntities && pendingEntities.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Active / History</TabsTrigger>
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
              <RequestCard key={req.id} entity={req} isPending={true} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
             {isLoadingActive ? (
                 <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
             ) : (
                  activeEntities?.map(req => (
                      <RequestCard key={req.id} entity={req} isPending={false} />
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
              variant={actionType === 'display' ? 'default' : (actionType === 'reject' ? 'destructive' : 'default')}
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
