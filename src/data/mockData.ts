import type { TrustAnchor, Entity, ApprovalRequest, DashboardStats } from '@/types/registry';

export const mockTrustAnchors: TrustAnchor[] = [
  {
    id: 'ta-1',
    name: 'My NREN Federation',
    entityId: 'https://federation.geant.org',
    description: 'Production federation for European research and education',
    type: 'federation',
    status: 'active',
    subordinateCount: 127,
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ta-3',
    name: 'Test Federation',
    entityId: 'https://test.federation.geant.org',
    description: 'Testing environment for new entities',
    type: 'test',
    status: 'active',
    subordinateCount: 23,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },
];

export const mockEntities: Entity[] = [];

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
