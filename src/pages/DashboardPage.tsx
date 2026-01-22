import { Building2, Shield, ClipboardCheck, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTypeBadge } from '@/components/ui/entity-type-badge';
import { mockDashboardStats, mockEntities, mockApprovalRequests } from '@/data/mockData';

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
  const stats = mockDashboardStats;
  const recentEntities = mockEntities.slice(0, 5);
  const pendingApprovals = mockApprovalRequests.filter(r => r.status === 'pending');

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
          value={stats.totalEntities}
          description={`${stats.activeEntities} active`}
          icon={Building2}
          trend={{ value: 8, positive: true }}
          href="/entities"
        />
        <StatCard
          title="OpenID Providers"
          value={stats.opCount}
          description="Identity providers"
          icon={Shield}
          href="/entities?type=op"
        />
        <StatCard
          title="Relying Parties"
          value={stats.rpCount}
          description="Service providers"
          icon={Users}
          href="/entities?type=rp"
        />
        {isAdmin && (
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            description="Awaiting review"
            icon={ClipboardCheck}
            href="/approvals"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent entities */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Entities</CardTitle>
              <CardDescription>Latest registered entities in the federation</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/entities">
                View all <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEntities.map((entity) => (
                <Link
                  key={entity.id}
                  to={`/entities/${entity.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-accent transition-colors">
                        {entity.displayName || entity.entityId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entity.organizationName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {entity.entityTypes.map((type) => (
                        <EntityTypeBadge key={type} type={type} />
                      ))}
                    </div>
                    <StatusBadge status={entity.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

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
