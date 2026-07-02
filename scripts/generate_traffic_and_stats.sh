#!/usr/bin/env bash
# Generate federation protocol traffic against both LightHouse instances,
# then print a stats summary from the admin API.
#
# Usage:
#   ./scripts/generate_traffic_and_stats.sh
#
# Requirements: curl, python3 (stdlib only)
# Both instances must be reachable at localhost:8081 (ta-1) and localhost:8082 (ta-2).

set -euo pipefail

TA1="http://localhost:8081"
TA2="http://localhost:8082"

# ── helpers ────────────────────────────────────────────────────────────────────

hit() {
  local url="$1"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  echo "  $status  $url"
}

section() { echo; echo "── $* ──"; }

urlencode() {
  python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1"
}

# ── 1. Generate traffic ────────────────────────────────────────────────────────

section "Generating traffic on ta-1 ($TA1)"

SUBS=$(curl -s "$TA1/list" | python3 -c "
import sys, json
try:
    ids = json.load(sys.stdin)
    print('\n'.join(ids[:3]))
except Exception:
    pass
")
SUB1=$(echo "$SUBS" | head -1)
SUB2=$(echo "$SUBS" | sed -n '2p')

for i in $(seq 1 5); do hit "$TA1/.well-known/openid-federation"; done
for i in $(seq 1 3); do hit "$TA1/list"; done

if [ -n "$SUB1" ]; then
  for i in $(seq 1 4); do hit "$TA1/fetch?iss=$TA1&sub=$(urlencode "$SUB1")"; done
fi
if [ -n "$SUB2" ]; then
  for i in $(seq 1 2); do hit "$TA1/fetch?iss=$TA1&sub=$(urlencode "$SUB2")"; done
fi

hit "$TA1/fetch?iss=$TA1&sub=https://nonexistent.example.org" || true
hit "$TA1/resolve?sub=https://nonexistent.example.org&anchor=$TA1" || true

section "Generating traffic on ta-2 ($TA2)"

SUBS2=$(curl -s "$TA2/list" | python3 -c "
import sys, json
try:
    ids = json.load(sys.stdin)
    print('\n'.join(ids[:2]))
except Exception:
    pass
")
SUB2_1=$(echo "$SUBS2" | head -1)

for i in $(seq 1 5); do hit "$TA2/.well-known/openid-federation"; done
for i in $(seq 1 3); do hit "$TA2/list"; done

if [ -n "$SUB2_1" ]; then
  for i in $(seq 1 3); do hit "$TA2/fetch?iss=$TA2&sub=$(urlencode "$SUB2_1")"; done
fi
hit "$TA2/fetch?iss=$TA2&sub=https://nonexistent.example.org" || true

# ── 2. Wait for LightHouse to flush logs ──────────────────────────────────────

echo
echo "Waiting 2s for LightHouse to flush request logs…"
sleep 2

# ── 3. Print stats ────────────────────────────────────────────────────────────

print_stats() {
  local label="$1"
  local base="$2"

  section "Stats: $label ($base)"
  python3 - "$base" <<'PYEOF'
import urllib.request, urllib.error, json, sys
from datetime import datetime, timezone, timedelta

base = sys.argv[1]
frm  = (datetime.now(timezone.utc) - timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')

def get(path):
    try:
        r = urllib.request.urlopen(f"{base}{path}")
        return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read(120).decode()}")
        return None

# Summary
summary = get(f"/api/v1/admin/stats/summary?from={frm}")
if summary and "summary" in summary:
    s = summary["summary"]
    print(f"  Total requests : {s.get('total_requests', 0)}")
    print(f"  Total errors   : {s.get('total_errors', 0)}")
    print(f"  Error rate     : {s.get('error_rate', 0)*100:.1f}%")
    print(f"  Avg latency    : {s.get('avg_latency_ms', 0):.1f} ms  "
          f"(p95: {s.get('p95_latency_ms', 0):.0f} ms)")
    print(f"  Unique clients : {s.get('unique_clients', 0)}")

    by_status = s.get("requests_by_status", {})
    if by_status:
        status_str = "  By status      : " + "  ".join(
            f"HTTP {k}: {v}" for k, v in sorted(by_status.items())
        )
        print(status_str)

# Top endpoints
top = get(f"/api/v1/admin/stats/top/endpoints?from={frm}&limit=10")
if top and "endpoints" in top and top["endpoints"]:
    total = sum(e["count"] for e in top["endpoints"])
    print()
    print(f"  {'Endpoint':<46} {'Reqs':>5}  {'Share':>5}")
    print(f"  {'-'*46} {'-'*5}  {'-'*5}")
    for ep in top["endpoints"]:
        pct = ep["count"] / total * 100 if total else 0
        print(f"  {ep['value']:<46} {ep['count']:>5}  {pct:>4.0f}%")

# Note: timeseries endpoint returns 500 due to a known LightHouse SQLite
# datetime scan bug — omitted here.
PYEOF
}

print_stats "ta-1" "$TA1"
print_stats "ta-2" "$TA2"

echo
echo "Done. Refresh the Stats page (1h range) to see the data in the UI."
