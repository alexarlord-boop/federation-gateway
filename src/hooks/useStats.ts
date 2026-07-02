import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

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
  ts: string;
  count: number;
  errors: number;
}

export interface StatsTimeseriesResponse {
  from: string;
  to: string;
  interval: string;
  endpoint: string;
  timeseries: TimeseriesPoint[];
}

export interface TopEndpointItem {
  value: string;
  count: number;
}

export interface StatsTopEndpointsResponse {
  from: string;
  to: string;
  limit: number;
  endpoints: TopEndpointItem[];
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
