# Feature Spec: Federation Statistics Dashboard

## Problem

Our Dashboard currently shows only static entity counts derived from the entity list
(`active`, `blocked`, `inactive`, `pending`). This gives operators no visibility into
actual federation traffic — endpoint hit rates, latency, client diversity, or error
trends. LightHouse ships a full stats API (`/api/v1/admin/stats/`) but it is unused
and stats collection is disabled in our `lighthouse/config.yaml`.

## Goal

Add a **Statistics** section to the Dashboard (or a dedicated `/stats` page) that
surfaces live federation traffic metrics fetched from LightHouse's stats API.

---

## LightHouse Stats API (backend reality)

Stats must be **enabled** in `lighthouse/config.yaml` first:

```yaml
stats:
  enabled: true
```

LightHouse then exposes under `GET /api/v1/admin/stats/`:

| Endpoint | Returns |
|---|---|
| `stats/summary` | total requests, error rate, avg/p95/p99 latency, unique clients |
| `stats/timeseries` | request counts over time, bucketed by `minute/hour/day/week/month` |
| `stats/top/endpoints` | top-N endpoints by request count |
| `stats/top/clients` | top-N client IPs |
| `stats/top/user-agents` | top-N User-Agent strings |
| `stats/top/countries` | top-N countries (if GeoIP enabled) |
| `stats/top/params` | top-N query param combos per endpoint |

All accept `from`, `to` (RFC3339 or `YYYY-MM-DD`), `limit`, `endpoint`, `interval` query params.

The BFF generic proxy (`/api/v1/proxy/{instance_id}/{path}`) can forward these
requests without any new BFF routes needed.

---

## Proposed UI

### Location
New tab on the existing **Dashboard** page: `Overview` (current) | `Statistics`.  
Or a top-level `/stats` page linked from the sidebar under *Federation*.

### Components

**Summary cards** (top row)
- Total requests (last 24 h)
- Error rate (%)
- Avg latency / p95 latency (ms)
- Unique clients

**Timeseries chart**
- Line chart: requests per hour over the selected time range
- Secondary line: error count
- Uses a lightweight chart library already in the project (or `recharts` — check
  `package.json` first or modern and nice-looking shadcn charts)

**Top endpoints table**
- Endpoint name | Request count | % of total
- Sorted descending

**Time range selector**
- Quick picks: Last 1h / 24h / 7d / 30d
- Maps to `from`/`to` params

### Data fetching
- `useStatsQuery(path, params)` — thin wrapper around the BFF proxy call
- Polling: `refetchInterval: 60_000` (1 min) while the tab is active
- `staleTime: 30_000` — avoid refetching on every tab focus

---

## BFF changes needed

**Enable stats in LightHouse config:**
```yaml
# lighthouse/config.yaml
stats:
  enabled: true
```

**No new BFF routes required** — all stat calls go through the existing proxy:
```
GET /api/v1/proxy/{instance_id}/stats/summary?from=...&to=...
GET /api/v1/proxy/{instance_id}/stats/timeseries?interval=hour
GET /api/v1/proxy/{instance_id}/stats/top/endpoints?limit=10
```

**Capabilities manifest** — optionally add a `statistics` feature flag so the UI
hides the tab gracefully when stats are disabled (404 on the first call can serve
as a sufficient guard too).

---

## Gaps / Caveats

- Stats are **disabled by default** in LightHouse and will 404 until `stats.enabled: true`
  is set in config. The UI must handle 404 gracefully with a "Statistics not enabled"
  empty state and a link to documentation.
- GeoIP / country stats require additional LightHouse GeoIP configuration — treat as
  optional; hide the countries card if the endpoint returns no data.
- No chart library is currently imported. `recharts` is the most common React charting
  library and has a small bundle footprint; or use a simple CSS-only sparkline for v1.

---

## Implementation checklist

- [ ] Enable `stats: enabled: true` in `lighthouse/config.yaml`
- [ ] Add `useStatsQuery` hook (`src/hooks/useStats.ts`)
- [ ] Add `StatsSummaryCards` component
- [ ] Add `StatsTimeseriesChart` component (or sparkline fallback)
- [ ] Add `StatsTopEndpointsTable` component
- [ ] Add time range selector component
- [ ] Wire into Dashboard as second tab or `/stats` page
- [ ] Add sidebar link (if standalone page)
- [ ] Add 404 / "stats disabled" empty state
- [ ] Add e2e test: stats tab is accessible and shows summary cards
