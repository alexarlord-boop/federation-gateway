import { Building2, CheckCircle2, ClipboardCheck, Network, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityRoleBadges } from '@/components/ui/entity-type-badge';
import { useEntities } from '@/hooks/useEntities';
import { InstanceInfoPanel } from '@/components/InstanceInfoPanel';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  href 
}: { 
  title: string; 
  value: number | string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <Card className="stat-card group cursor-pointer h-full">
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
  const { activeTrustAnchor } = useTrustAnchor();
  const { entities, isLoading } = useEntities();
  
  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to view the dashboard.</p>
      </div>
    );
  }

  const pendingApprovals = entities.filter(e => e.status === 'pending');
  
  // Calculate stats from real data
  const totalEntities = entities.length;
  const activeEntities = entities.filter(e => e.status === 'active').length;
  const intermediateEntities = entities.filter(e => e.entityTypes.every(t => t === 'federation_entity')).length;
  
  const recentEntities = entities.slice(0, 5);
  const visiblePendingApprovals = pendingApprovals.slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome back, {user?.name}. Here's an overview of your federation.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
        <StatCard
          title="Total Entities"
          value={isLoading ? "-" : totalEntities}
          description={`${isLoading ? "-" : activeEntities} active`}
          icon={Building2}
          href="/entities"
        />
        <StatCard
          title="Active"
          value={isLoading ? "-" : activeEntities}
          description="Currently operational"
          icon={CheckCircle2}
          href="/entities"
        />
        <StatCard
          title="Intermediates"
          value={isLoading ? "-" : intermediateEntities}
          description="Federation-only nodes"
          icon={Network}
          href="/entities"
        />
        <StatCard
          title="Pending Approvals"
          value={isLoading ? '-' : pendingApprovals.length}
          description="Awaiting review"
          icon={ClipboardCheck}
          href={isAdmin ? "/approvals" : undefined}
        />
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
                          <EntityRoleBadges types={entity.entityTypes} />
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

        {/* At-a-glance sidebar: pending approvals + instance info */}
        <div className="space-y-6">
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
                    {visiblePendingApprovals.map((entity) => (
                      <Link
                        key={entity.id}
                        to={`/entities/${entity.id}`}
                        className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{entity.displayName || entity.entityId}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {entity.entityId}
                        </p>
                      </Link>
                    ))}
                    {pendingApprovals.length > visiblePendingApprovals.length && (
                      <Link
                        to="/approvals"
                        className="block text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                      >
                        +{pendingApprovals.length - visiblePendingApprovals.length} more awaiting review
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <InstanceInfoPanel />
        </div>
      </div>
    </div>
  );
}
