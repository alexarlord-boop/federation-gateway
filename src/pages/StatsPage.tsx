import { useState } from 'react';
import {
  BarChart3, Activity, Clock, Users, AlertCircle, Loader2, Download,
  Monitor, Network, SlidersHorizontal, Globe, ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import {
  useStatsSummary,
  useStatsTopEndpoints,
  useStatsTopUserAgents,
  useStatsTopClients,
  useStatsTopCountries,
  useStatsTopParams,
  useStatsLatency,
  useStatsTimeseries,
  useStatsDaily,
  downloadStatsExport,
  type TimeRange,
  type TopItem,
  type DailyStatsRow,
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

/** Generic "top N by value/count" table, shared by user agents, clients, and query params. */
function TopListCard({
  title,
  icon: Icon,
  items,
  isLoading,
  emptyLabel,
  valueClassName = 'font-mono text-xs',
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: TopItem[] | null | undefined;
  isLoading: boolean;
  emptyLabel: string;
  valueClassName?: string;
}) {
  const list = items ?? [];
  const total = list.reduce((a, e) => a + e.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">{emptyLabel}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {list.map((item, i) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className={`py-2.5 px-4 break-all ${valueClassName}`} title={item.value}>
                      {item.value}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap">{fmt(item.count)}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap w-24">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
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
  );
}

function formatTick(ts: string, interval: string) {
  const d = new Date(ts);
  if (interval === 'minute' || interval === 'hour') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TimeseriesTooltip({ active, payload, label, interval }: {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number; color: string }[];
  label?: string;
  interval: string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 shadow-md text-xs min-w-[140px]">
      <p className="text-muted-foreground mb-1.5">{formatTick(label, interval)}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="inline-block w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-semibold tabular-nums text-foreground ml-auto">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTimeseriesChart({ instanceId, range }: { instanceId: string | undefined; range: TimeRange }) {
  const timeseries = useStatsTimeseries(instanceId, range);
  const points = timeseries.data?.timeseries ?? [];
  const interval = timeseries.data?.interval ?? 'hour';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Requests Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {timeseries.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : points.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No data for this period
          </div>
        ) : (
          <div style={{ opacity: timeseries.isPlaceholderData ? 0.5 : 1, transition: 'opacity 150ms' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v) => formatTick(v, interval)}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  minTickGap={32}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => fmt(v)}
                />
                <RechartsTooltip
                  content={<TimeseriesTooltip interval={interval} />}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                />
                <Legend verticalAlign="top" align="right" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="request_count"
                  name="Total Requests"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
                <Line
                  type="monotone"
                  dataKey="error_count"
                  name="Errors"
                  stroke="hsl(var(--chart-line-2))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DailyTotal {
  date: string;
  requests: number;
  errors: number;
  topEndpoint: string;
  topEndpointCount: number;
}

/** `daily` is rows per (date, endpoint, status_code) — far more granular than
 * timeseries. Rolled up here into one row per date (summed requests/errors,
 * plus whichever endpoint had the most traffic that day) since a raw
 * per-endpoint-per-status table would be dozens of rows for a single day on
 * a busy instance. Only ever shows *completed* days — LightHouse rolls
 * daily stats up once a day is over, unlike timeseries' live aggregation,
 * so "today" typically won't appear here yet. */
function rollUpDaily(rows: DailyStatsRow[]): DailyTotal[] {
  const byDate = new Map<string, DailyTotal>();
  for (const row of rows) {
    let entry = byDate.get(row.date);
    if (!entry) {
      entry = { date: row.date, requests: 0, errors: 0, topEndpoint: '', topEndpointCount: 0 };
      byDate.set(row.date, entry);
    }
    entry.requests += row.request_count;
    entry.errors += row.error_count;
    if (row.request_count > entry.topEndpointCount) {
      entry.topEndpoint = row.endpoint;
      entry.topEndpointCount = row.request_count;
    }
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function DailyBreakdownTable({ instanceId, range }: { instanceId: string | undefined; range: TimeRange }) {
  const daily = useStatsDaily(instanceId, range);
  const totals = rollUpDaily(daily.data?.daily ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {daily.isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : totals.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">
            No completed days in this range yet — daily rolls up once a calendar day is over.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Requests</th>
                <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Errors</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Top Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((day) => (
                <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-4">
                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{fmt(day.requests)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    <span className={day.errors > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                      {fmt(day.errors)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{day.topEndpoint || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const [range, setRange] = useState<TimeRange>('24h');
  const { toast } = useToast();

  const summary = useStatsSummary(instanceId, range);
  const topEndpoints = useStatsTopEndpoints(instanceId, range);
  const topUserAgents = useStatsTopUserAgents(instanceId, range);
  const topClients = useStatsTopClients(instanceId, range);
  const topCountries = useStatsTopCountries(instanceId, range);
  const topParams = useStatsTopParams(instanceId, range);
  const latency = useStatsLatency(instanceId, range);

  const isLoading = summary.isLoading;
  const statsDisabled = summary.data === null && !summary.isLoading;

  const handleExport = async (format: 'csv' | 'json') => {
    if (!instanceId) return;
    try {
      await downloadStatsExport(instanceId, range, format);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Export failed', description: String(err?.message ?? err) });
    }
  };

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
  const lat = latency.data?.latency;

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
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Requests over time */}
      <RequestsTimeseriesChart instanceId={instanceId} range={range} />

      {/* Daily breakdown */}
      <DailyBreakdownTable instanceId={instanceId} range={range} />

      {/* Latency percentiles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latency Percentiles</CardTitle>
        </CardHeader>
        <CardContent>
          {latency.isLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !lat ? (
            <p className="text-sm text-muted-foreground">No latency data for this period.</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
              {([
                ['min', lat.min_ms], ['p50', lat.p50_ms], ['p75', lat.p75_ms],
                ['p90', lat.p90_ms], ['p95', lat.p95_ms], ['p99', lat.p99_ms],
                ['max', lat.max_ms],
              ] as const).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{fmt(val, 1)} ms</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Top user agents / clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopListCard
          title="Top User Agents"
          icon={Monitor}
          items={topUserAgents.data}
          isLoading={topUserAgents.isLoading}
          emptyLabel="No user agent data for this period."
        />
        <TopListCard
          title="Top Clients"
          icon={Network}
          items={topClients.data}
          isLoading={topClients.isLoading}
          emptyLabel="No client data for this period."
        />
      </div>

      {/* Top query params + countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopListCard
          title="Top Query Parameters"
          icon={SlidersHorizontal}
          items={topParams.data}
          isLoading={topParams.isLoading}
          emptyLabel="No query parameter data for this period."
        />
        <TopListCard
          title="Top Countries"
          icon={Globe}
          items={topCountries.data}
          isLoading={topCountries.isLoading}
          emptyLabel="No geographic data — GeoIP is not configured on this instance."
          valueClassName="text-xs"
        />
      </div>
    </div>
  );
}
