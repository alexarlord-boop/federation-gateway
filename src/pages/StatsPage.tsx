import { useState } from 'react';
import { BarChart3, Activity, Clock, Users, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import {
  useStatsSummary,
  useStatsTimeseries,
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

function fmtTs(ts: string, range: TimeRange) {
  const d = new Date(ts);
  if (range === '1h') return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (range === '24h') return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StatsPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const [range, setRange] = useState<TimeRange>('24h');

  const summary = useStatsSummary(instanceId, range);
  const timeseries = useStatsTimeseries(instanceId, range);
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
  const tsData = (timeseries.data?.timeseries ?? []).map((p) => ({
    ...p,
    label: fmtTs(p.ts, range),
  }));
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

      {/* Timeseries chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Request Traffic</CardTitle>
          {timeseries.isFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {tsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No traffic data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={tsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(l) => `Time: ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Requests"
                  strokeWidth={2}
                  dot={false}
                  stroke="hsl(var(--accent))"
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  name="Errors"
                  strokeWidth={1.5}
                  dot={false}
                  stroke="hsl(var(--destructive))"
                />
              </LineChart>
            </ResponsiveContainer>
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
