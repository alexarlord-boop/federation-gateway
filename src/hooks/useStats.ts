import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';
import { getAccessToken } from '@/lib/token-manager';
import { GATEWAY_BASE } from '@/lib/api-config';

export interface StatsSummary {
  total_requests: number;
  total_errors: number;
  error_rate: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  unique_clients: number;
  unique_user_agents: number;
  requests_by_status: Record<string, number>;
  requests_by_endpoint: Record<string, number>;
}

export interface StatsSummaryResponse {
  from: string;
  to: string;
  summary: StatsSummary;
}

export interface TimeseriesPoint {
  timestamp: string;
  request_count: number;
  error_count: number;
  avg_latency_ms: number;
}

export interface StatsTimeseriesResponse {
  from: string;
  to: string;
  interval: string;
  endpoint: string;
  timeseries: TimeseriesPoint[];
}

export interface TopItem {
  value: string;
  count: number;
}

export interface StatsTopEndpointsResponse {
  from: string;
  to: string;
  limit: number;
  endpoints: TopItem[];
}

export interface StatsLatency {
  p50_ms: number;
  p75_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
}

export interface StatsLatencyResponse {
  from: string;
  to: string;
  endpoint: string;
  latency: StatsLatency;
}

/** One row per (date, endpoint, status_code) — daily is far more granular
 * than timeseries, which only aggregates totals per bucket. */
export interface DailyStatsRow {
  date: string;
  endpoint: string;
  status_code: number;
  request_count: number;
  error_count: number;
  duration_avg_ms: number;
  duration_p50_ms: number;
  duration_p95_ms: number;
  duration_p99_ms: number;
}

export interface StatsDailyResponse {
  from: string;
  to: string;
  daily: DailyStatsRow[];
}

export type TimeRange = '1h' | '24h' | '7d' | '30d';

function rangeToFrom(range: TimeRange): string {
  const now = new Date();
  const offsets: Record<TimeRange, number> = {
    '1h':  1 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d':  7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - offsets[range]).toISOString();
}

function rangeToInterval(range: TimeRange): string {
  return { '1h': 'minute', '24h': 'hour', '7d': 'day', '30d': 'day' }[range];
}

function proxyPath(instanceId: string, subPath: string): string {
  return `/api/v1/proxy/${encodeURIComponent(instanceId)}/api/v1/admin/stats/${subPath}`;
}

/** Generic "top N by value" query shared by user-agents, clients, countries. */
function useStatsTopList(
  kind: 'top/user-agents' | 'top/clients' | 'top/countries',
  responseKey: 'user_agents' | 'clients' | 'countries',
  instanceId: string | undefined,
  range: TimeRange,
  limit: number,
) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', kind, instanceId, range, limit],
    queryFn: async () => {
      const res = await gatewayFetch<Record<string, TopItem[] | string | number>>({
        path: `${proxyPath(instanceId!, kind)}?from=${encodeURIComponent(from)}&limit=${limit}`,
        softFail: [404, 500, 501],
      });
      return res ? ((res[responseKey] as TopItem[]) ?? []) : null;
    },
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsSummary(instanceId: string | undefined, range: TimeRange) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', 'summary', instanceId, range],
    queryFn: () =>
      gatewayFetch<StatsSummaryResponse>({
        path: `${proxyPath(instanceId!, 'summary')}?from=${encodeURIComponent(from)}`,
        softFail: [404, 500, 501],
      }),
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsTimeseries(instanceId: string | undefined, range: TimeRange) {
  const from = rangeToFrom(range);
  const interval = rangeToInterval(range);
  return useQuery({
    queryKey: ['stats', 'timeseries', instanceId, range],
    queryFn: () =>
      gatewayFetch<StatsTimeseriesResponse>({
        path: `${proxyPath(instanceId!, 'timeseries')}?from=${encodeURIComponent(from)}&interval=${interval}`,
        softFail: [404, 500, 501],
      }),
    enabled: !!instanceId,
    // Keep the previous chart on screen (at reduced opacity in the UI) while a
    // new range loads, instead of flashing to a loading state.
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsDaily(instanceId: string | undefined, range: TimeRange) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', 'daily', instanceId, range],
    queryFn: () =>
      gatewayFetch<StatsDailyResponse>({
        path: `${proxyPath(instanceId!, 'daily')}?from=${encodeURIComponent(from)}`,
        softFail: [404, 500, 501],
      }),
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsTopEndpoints(instanceId: string | undefined, range: TimeRange, limit = 10) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', 'top-endpoints', instanceId, range, limit],
    queryFn: () =>
      gatewayFetch<StatsTopEndpointsResponse>({
        path: `${proxyPath(instanceId!, 'top/endpoints')}?from=${encodeURIComponent(from)}&limit=${limit}`,
        softFail: [404, 500, 501],
      }),
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsTopUserAgents(instanceId: string | undefined, range: TimeRange, limit = 10) {
  return useStatsTopList('top/user-agents', 'user_agents', instanceId, range, limit);
}

export function useStatsTopClients(instanceId: string | undefined, range: TimeRange, limit = 10) {
  return useStatsTopList('top/clients', 'clients', instanceId, range, limit);
}

export function useStatsTopCountries(instanceId: string | undefined, range: TimeRange, limit = 10) {
  return useStatsTopList('top/countries', 'countries', instanceId, range, limit);
}

export function useStatsTopParams(instanceId: string | undefined, range: TimeRange, limit = 10) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', 'top-params', instanceId, range, limit],
    queryFn: async () => {
      const res = await gatewayFetch<{ params: TopItem[] }>({
        path: `${proxyPath(instanceId!, 'top/params')}?from=${encodeURIComponent(from)}&limit=${limit}`,
        softFail: [404, 500, 501],
      });
      return res?.params ?? null;
    },
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStatsLatency(instanceId: string | undefined, range: TimeRange) {
  const from = rangeToFrom(range);
  return useQuery({
    queryKey: ['stats', 'latency', instanceId, range],
    queryFn: () =>
      gatewayFetch<StatsLatencyResponse>({
        path: `${proxyPath(instanceId!, 'latency')}?from=${encodeURIComponent(from)}`,
        softFail: [404, 500, 501],
      }),
    enabled: !!instanceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Triggers a browser download of the raw stats export (not a query — imperative, on click). */
export async function downloadStatsExport(
  instanceId: string,
  range: TimeRange,
  format: 'csv' | 'json',
): Promise<void> {
  const from = rangeToFrom(range);
  const token = getAccessToken();
  const url = `${GATEWAY_BASE}${proxyPath(instanceId, 'export')}?from=${encodeURIComponent(from)}&format=${format}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `stats-export-${instanceId}-${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
