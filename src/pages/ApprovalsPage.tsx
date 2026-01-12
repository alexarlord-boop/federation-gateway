import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Check, X, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockApprovalRequests } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const pendingRequests = mockApprovalRequests.filter(r => r.status === 'pending');
  const completedRequests = mockApprovalRequests.filter(r => r.status !== 'pending');

  const handleAction = () => {
    toast({
      title: actionType === 'approve' ? 'Request Approved' : 'Request Rejected',
      description: `The registration request has been ${actionType === 'approve' ? 'approved' : 'rejected'}.`,
    });
    setSelectedRequest(null);
    setActionType(null);
    setNotes('');
  };

  const RequestCard = ({ request }: { request: typeof mockApprovalRequests[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              request.status === 'pending' 
                ? 'bg-pending/10' 
                : request.status === 'approved'
                ? 'bg-success/10'
                : 'bg-destructive/10'
            }`}>
              <ClipboardCheck className={`w-5 h-5 ${
                request.status === 'pending'
                  ? 'text-pending'
                  : request.status === 'approved'
                  ? 'text-success'
                  : 'text-destructive'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold">{request.entityDisplayName}</h3>
              <p className="text-sm text-muted-foreground">
                {request.type.charAt(0).toUpperCase() + request.type.slice(1)} Request
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted by {request.submittedBy} • {new Date(request.submittedAt).toLocaleDateString()}
              </p>
              {request.reviewedBy && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reviewed by {request.reviewedBy} • {new Date(request.reviewedAt!).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {request.status === 'pending' ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/entities/${request.entityId}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  Review
                </Link>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  setSelectedRequest(request.id);
                  setActionType('reject');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setSelectedRequest(request.id);
                  setActionType('approve');
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          ) : (
            <span className={`entity-badge ${
              request.status === 'approved'
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-destructive/10 text-destructive border border-destructive/30'
            }`}>
              {request.status}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Approval Requests</h1>
        <p className="page-description">
          Review and process entity registration requests
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-pending/20 text-pending">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                <p className="text-muted-foreground">No pending approval requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No completed requests</p>
              </CardContent>
            </Card>
          ) : (
            completedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'This will activate the entity and make it operational in the federation.'
                : 'The entity will remain inactive. You can request changes from the submitter.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                {actionType === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
              </Label>
              <Textarea
                id="notes"
                placeholder={actionType === 'approve' 
                  ? 'Add any notes for the submitter...'
                  : 'Please explain why this request is being rejected...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
              setNotes('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
