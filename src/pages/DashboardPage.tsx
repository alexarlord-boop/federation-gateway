import { Building2, Shield, ClipboardCheck, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTypeBadge } from '@/components/ui/entity-type-badge';
import { mockDashboardStats, mockApprovalRequests } from '@/data/mockData';
import { useEntities } from '@/hooks/useEntities';

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  href 
}: { 
  title: string; 
  value: number | string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
  href?: string;
}) {
  const content = (
    <Card className="stat-card group cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <Icon className="w-6 h-6 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { entities, isLoading } = useEntities();
  
  const pendingApprovals = mockApprovalRequests.filter(r => r.status === 'pending');
  
  // Calculate stats from real data
  const totalEntities = entities.length;
  const activeEntities = entities.filter(e => e.status === 'active').length;
  const opCount = entities.filter(e => e.entityTypes.includes('openid_provider')).length;
  const rpCount = entities.filter(e => e.entityTypes.includes('openid_relying_party')).length;
  
  const recentEntities = entities.slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome back, {user?.name}. Here's an overview of your federation.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Entities"
          value={isLoading ? "-" : totalEntities}
          description={`${isLoading ? "-" : activeEntities} active`}
          icon={Building2}
          trend={{ value: 8, positive: true }}
          href="/entities"
        />
        <StatCard
          title="OpenID Providers"
          value={isLoading ? "-" : opCount}
          description="Identity providers"
          icon={Shield}
          href="/entities?type=op"
        />
        <StatCard
          title="Relying Parties"
          value={isLoading ? "-" : rpCount}
          description="Service providers"
          icon={Users}
          href="/entities?type=rp"
        />
        {isAdmin && (
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals.length}
            description="Awaiting review"
            icon={ClipboardCheck}
            href="/approvals"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Recent entities */}
         <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Entities</CardTitle>
                  <CardDescription>Recently registered or updated entities</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/entities">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                   <p className="text-muted-foreground text-sm">Loading...</p>
                ) : recentEntities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No entities found.</p>
                ) : (
                  recentEntities.map((entity) => (
                    <div key={entity.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{entity.displayName}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate max-w-[200px]">{entity.entityId}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex gap-1">
                          {entity.entityTypes.map(type => (
                             <EntityTypeBadge key={type} type={type as any} />
                          ))}
                        </div>
                        <StatusBadge status={entity.status as any} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending approvals (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Requests awaiting review</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/approvals">
                  View all <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((request) => (
                    <Link
                      key={request.id}
                      to={`/approvals/${request.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{request.entityDisplayName}</p>
                        <span className="entity-badge bg-pending/10 text-pending border border-pending/30">
                          {request.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted by {request.submittedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.submittedAt).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions for non-admin */}
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/entities/register">
                  <Building2 className="w-4 h-4 mr-2" />
                  Register New Entity
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/entities">
                  <Shield className="w-4 h-4 mr-2" />
                  View My Entities
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
