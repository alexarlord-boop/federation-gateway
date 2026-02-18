import type { TrustAnchorDisplay } from '@/hooks/useTrustAnchors';

interface ApprovalRequest {
  id: string;
  entityId: string;
  entityDisplayName: string;
  type: 'registration' | 'update' | 'deletion';
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

interface DashboardStats {
  totalEntities: number;
  activeEntities: number;
  pendingApprovals: number;
  trustAnchors: number;
  opCount: number;
  rpCount: number;
  recentRegistrations: number;
}

export const mockTrustAnchors: TrustAnchorDisplay[] = [
  {
    id: 'ta-1',
    name: 'My NREN Federation',
    entityId: 'https://federation.geant.org',
    description: 'Production federation for European research and education',
    type: 'federation',
    status: 'active',
    subordinateCount: 127,
  },
  {
    id: 'ta-3',
    name: 'Test Federation',
    entityId: 'https://test.federation.geant.org',
    description: 'Testing environment for new entities',
    type: 'test',
    status: 'active',
    subordinateCount: 23,
  },
];

export const mockApprovalRequests: ApprovalRequest[] = [];

export const mockDashboardStats: DashboardStats = {
  totalEntities: 0,
  activeEntities: 0,
  pendingApprovals: 0,
  trustAnchors: 2,
  opCount: 0,
  rpCount: 0,
  recentRegistrations: 0,
};
