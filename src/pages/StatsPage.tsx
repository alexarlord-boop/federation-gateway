import { useMemo } from 'react';
import { BarChart3, Building2, CheckCircle2, Clock, XCircle, Shield, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useTrustMarkSpecs } from '@/hooks/useTrustMarkIssuance';
import { useTrustMarkTypes } from '@/hooks/useTrustMarkTypes';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { ENTITY_TYPE_LABELS, type EntityType } from '@/components/ui/entity-type-badge';

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-accent',
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm font-medium">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const { data: subordinates, isLoading: subLoading } = useSubordinates();
  const { specs, isLoading: specsLoading } = useTrustMarkSpecs();
  const { trustMarkTypes, isLoading: typesLoading } = useTrustMarkTypes();

  const stats = useMemo(() => {
    const subs = subordinates ?? [];
    const total = subs.length;
    const byStatus = {
      active: subs.filter((s) => s.status === 'active').length,
      pending: subs.filter((s) => s.status === 'pending').length,
      blocked: subs.filter((s) => s.status === 'blocked').length,
      inactive: subs.filter((s) => s.status === 'inactive').length,
    };

    // Entity-type distribution (one subordinate can have multiple types)
    const typeCounts: Record<string, number> = {};
    for (const s of subs) {
      for (const t of s.registered_entity_types ?? []) {
        typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      }
    }

    const intermediates = subs.filter(
      (s) =>
        (s.registered_entity_types ?? []).length > 0 &&
        (s.registered_entity_types ?? []).every((t) => t === 'federation_entity'),
    ).length;

    return { total, byStatus, typeCounts, intermediates };
  }, [subordinates]);

  const isLoading = subLoading || specsLoading || typesLoading;

  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to view statistics.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const typeEntries = Object.entries(stats.typeCounts)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Federation Stats</h1>
        <p className="text-muted-foreground mt-1">
          Live counts for <span className="font-medium">{activeTrustAnchor.name}</span>
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Subordinates" value={stats.total} icon={Building2} />
        <KpiCard
          label="Active"
          value={stats.byStatus.active}
          sub={`${stats.total > 0 ? Math.round((stats.byStatus.active / stats.total) * 100) : 0}% of total`}
          icon={CheckCircle2}
          color="text-success"
        />
        <KpiCard
          label="Pending Approval"
          value={stats.byStatus.pending}
          icon={Clock}
          color="text-warning"
        />
        <KpiCard
          label="Intermediates"
          value={stats.intermediates}
          sub="Federation-only nodes"
          icon={Shield}
          color="text-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarRow label="Active" count={stats.byStatus.active} total={stats.total} color="bg-success" />
            <BarRow label="Pending" count={stats.byStatus.pending} total={stats.total} color="bg-warning" />
            <BarRow label="Blocked" count={stats.byStatus.blocked} total={stats.total} color="bg-destructive" />
            <BarRow label="Inactive" count={stats.byStatus.inactive} total={stats.total} color="bg-muted-foreground" />
          </CardContent>
        </Card>

        {/* Entity-type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entity-Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {typeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entity type data.</p>
            ) : (
              <div className="space-y-4">
                {typeEntries.map(([type, count]) => (
                  <BarRow
                    key={type}
                    label={ENTITY_TYPE_LABELS[type as EntityType] ?? type.replace(/_/g, ' ')}
                    count={count}
                    total={stats.total}
                    color="bg-accent"
                  />
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Subordinates may have multiple types — percentages are of total subordinate count.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trust marks summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" />
              Trust Mark Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Registered types</span>
              <Badge variant="secondary">{trustMarkTypes.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Issuance specs</span>
              <Badge variant="secondary">{specs.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Coverage ratio</span>
              <Badge variant="secondary">
                {stats.total > 0
                  ? `${Math.min(specs.length, stats.total)} / ${stats.total}`
                  : '—'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Blocked / inactive summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending approvals</span>
              <Badge variant={stats.byStatus.pending > 0 ? 'default' : 'secondary'}>
                {stats.byStatus.pending}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Blocked entities</span>
              <Badge variant={stats.byStatus.blocked > 0 ? 'destructive' : 'secondary'}>
                {stats.byStatus.blocked}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Inactive entities</span>
              <Badge variant="secondary">{stats.byStatus.inactive}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
