import { useState } from 'react';
import { BarChart3, Activity, Clock, Users, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import {
  useStatsSummary,
  useStatsTopEndpoints,
  type TimeRange,
} from '@/hooks/useStats';

const RANGES: { label: string; value: TimeRange }[] = [
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-accent',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-sm font-medium">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(n: number, decimals = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(decimals);
}

const STATUS_COLORS: Record<string, string> = {
  '200': 'bg-green-500',
  '201': 'bg-green-400',
  '400': 'bg-yellow-400',
  '401': 'bg-orange-400',
  '403': 'bg-orange-500',
  '404': 'bg-yellow-500',
  '500': 'bg-red-500',
  '502': 'bg-red-400',
  '503': 'bg-red-400',
};

function statusColor(code: string) {
  if (STATUS_COLORS[code]) return STATUS_COLORS[code];
  if (code.startsWith('2')) return 'bg-green-400';
  if (code.startsWith('3')) return 'bg-blue-400';
  if (code.startsWith('4')) return 'bg-yellow-400';
  return 'bg-red-400';
}

export default function StatsPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const [range, setRange] = useState<TimeRange>('24h');

  const summary = useStatsSummary(instanceId, range);
  const topEndpoints = useStatsTopEndpoints(instanceId, range);

  const isLoading = summary.isLoading;
  const statsDisabled = summary.data === null && !summary.isLoading;

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

  if (statsDisabled) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Statistics Not Enabled</h3>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm">
          Add <code className="bg-muted px-1 rounded">stats: enabled: true</code> to{' '}
          <code className="bg-muted px-1 rounded">lighthouse/config.yaml</code> and restart to enable traffic metrics.
        </p>
      </div>
    );
  }

  const s = summary.data?.summary;
  const byStatus = Object.entries(s?.requests_by_status ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  const totalForPct = byStatus.reduce((acc, [, v]) => acc + v, 0);
  const endpoints = topEndpoints.data?.endpoints ?? [];
  const totalEndpointRequests = endpoints.reduce((a, e) => a + e.count, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Federation Stats</h1>
          <p className="text-muted-foreground mt-1">
            Traffic metrics for <span className="font-medium">{activeTrustAnchor.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Requests"
          value={fmt(s?.total_requests ?? 0)}
          icon={Activity}
          color="text-accent"
        />
        <KpiCard
          label="Error Rate"
          value={`${((s?.error_rate ?? 0) * 100).toFixed(1)}%`}
          sub={`${fmt(s?.total_errors ?? 0)} errors`}
          icon={AlertCircle}
          color={(s?.error_rate ?? 0) > 0.05 ? 'text-destructive' : 'text-success'}
        />
        <KpiCard
          label="Avg / P95 Latency"
          value={`${fmt(s?.avg_latency_ms ?? 0, 1)} ms`}
          sub={`p95: ${fmt(s?.p95_latency_ms ?? 0, 1)} ms`}
          icon={Clock}
          color="text-primary"
        />
        <KpiCard
          label="Unique Clients"
          value={fmt(s?.unique_clients ?? 0)}
          sub={`${fmt(s?.unique_user_agents ?? 0)} user agents`}
          icon={Users}
          color="text-warning"
        />
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Requests by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {byStatus.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
              No data for this period
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div className="flex h-4 rounded-full overflow-hidden gap-px">
                {byStatus.map(([code, count]) => (
                  <div
                    key={code}
                    className={`${statusColor(code)} transition-all`}
                    style={{ width: `${(count / totalForPct) * 100}%` }}
                    title={`HTTP ${code}: ${count}`}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {byStatus.map(([code, count]) => (
                  <div key={code} className="flex items-center gap-2 text-sm">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${statusColor(code)}`} />
                    <span className="font-mono text-xs text-muted-foreground">HTTP {code}</span>
                    <span className="font-medium tabular-nums">{fmt(count)}</span>
                    <span className="text-xs text-muted-foreground">
                      {totalForPct > 0 ? `${((count / totalForPct) * 100).toFixed(0)}%` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No endpoint data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Endpoint</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Requests</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => {
                  const pct = totalEndpointRequests > 0 ? (ep.count / totalEndpointRequests) * 100 : 0;
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs">{ep.value}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{fmt(ep.count)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
