import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollText, Loader2, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { useInfiniteAuditLogs, type AuditLogEntry } from '@/hooks/useAuditLogs';
import JsonView from '@uiw/react-json-view';

const ACTION_COLORS: Record<string, string> = {
  register:           'bg-success/10 text-success border-success/20',
  register_subordinate: 'bg-success/10 text-success border-success/20',
  update_status:      'bg-warning/10 text-warning border-warning/20',
  update:             'bg-primary/10 text-primary border-primary/20',
  update_metadata:    'bg-primary/10 text-primary border-primary/20',
  update_jwks:        'bg-primary/10 text-primary border-primary/20',
  update_constraints: 'bg-primary/10 text-primary border-primary/20',
  update_policy:      'bg-primary/10 text-primary border-primary/20',
  delete:             'bg-destructive/10 text-destructive border-destructive/20',
  create:             'bg-success/10 text-success border-success/20',
  issue:              'bg-success/10 text-success border-success/20',
  revoke:             'bg-destructive/10 text-destructive border-destructive/20',
  approve:            'bg-success/10 text-success border-success/20',
  decline:            'bg-destructive/10 text-destructive border-destructive/20',
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-muted text-muted-foreground border-muted';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

/**
 * `details` holds the redacted upstream response body (see backend/app/utils/audit.py).
 * It can be:
 *   - absent (older entries, or actions where the response wasn't JSON)
 *   - valid JSON
 *   - JSON truncated mid-structure (payload exceeded the storage cap) — falls
 *     back to raw text display rather than failing to parse.
 */
function AuditDetailsDialog({ entry, open, onClose }: { entry: AuditLogEntry; open: boolean; onClose: () => void }) {
  let parsed: unknown = null;
  let parseFailed = false;
  if (entry.details) {
    try {
      parsed = JSON.parse(entry.details);
    } catch {
      parseFailed = true;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Action Details</DialogTitle>
          <DialogDescription>
            <ActionBadge action={entry.action} />{' '}
            <span className="ml-1">{entry.resource_type.replace(/_/g, ' ')}</span>
            {entry.resource_id && <span className="font-mono text-xs ml-1">· {entry.resource_id}</span>}
            {' — '}the resulting server state, as returned by the admin API. Sensitive fields
            (keys, tokens, credentials) are redacted before storage.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] rounded-md border bg-muted/30 p-3">
          {parseFailed ? (
            <pre className="text-xs whitespace-pre-wrap break-all font-mono">
              {entry.details}
              <span className="text-muted-foreground italic block mt-2">
                (payload was truncated before storage — not valid JSON)
              </span>
            </pre>
          ) : parsed !== null ? (
            <JsonView value={parsed as object} collapsed={2} style={{ fontSize: 12 }} />
          ) : (
            <p className="text-sm text-muted-foreground">No details recorded for this action.</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function LogRow({ entry }: { entry: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(entry.created_at)}</td>
      <td className="py-3 px-4"><ActionBadge action={entry.action} /></td>
      <td className="py-3 px-4 text-sm">{entry.resource_type.replace(/_/g, ' ')}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground font-mono max-w-[200px] truncate">{entry.resource_id ?? '—'}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground">{entry.user_email ?? entry.user_id}</td>
      <td className="py-3 px-4">
        {entry.details ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowDetails(true)}>
            <FileJson className="w-3.5 h-3.5" />
            View
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
        {showDetails && (
          <AuditDetailsDialog entry={entry} open={showDetails} onClose={() => setShowDetails(false)} />
        )}
      </td>
    </tr>
  );
}

const RESOURCE_TYPES = ['subordinate', 'trust_mark_spec', 'trust_mark', 'registration'];
const ACTIONS = [
  'register', 'update_status', 'update', 'update_metadata', 'update_jwks',
  'update_constraints', 'update_policy', 'delete', 'create', 'issue', 'revoke',
  'approve', 'decline',
];

/** Fires `onIntersect` once the sentinel scrolls into view. Used to trigger
 * the next page load — the standard infinite-scroll pattern, no polling. */
function useLoadMoreSentinel(onIntersect: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin: '200px' }, // start loading before the sentinel is actually visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}

export default function AuditLogPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const {
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteAuditLogs({
    tenant_id: activeTrustAnchor?.id,
    resource_type: resourceType || undefined,
    action: action || undefined,
  });

  // Changing a filter changes the query key, so React Query starts a fresh
  // accumulation from page 1 automatically — no manual page reset needed.
  const allItems = useMemo(() => data?.pages.flatMap((p) => p?.items ?? []) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const sentinelRef = useLoadMoreSentinel(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    !isLoading,
  );

  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to view audit logs.</p>
      </div>
    );
  }

  // Client-side text match on user email/ID, applied across every page
  // loaded *so far* — unlike the old page-by-page view, this widens as you
  // scroll rather than only ever searching one page of 20 at a time. It
  // still can't find a match that hasn't been scrolled to yet; there's no
  // server-side fuzzy user search (only exact user_id), so a very specific
  // search may need a few scrolls to surface matches from further back.
  const items = allItems.filter((e) =>
    userSearch ? (e.user_email ?? e.user_id).toLowerCase().includes(userSearch.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Actions performed on <span className="font-medium">{activeTrustAnchor.name}</span>
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={resourceType} onValueChange={(v) => setResourceType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All resource types</SelectItem>
                {RESOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={(v) => setAction(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="w-48"
              placeholder="Filter by user…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            {(resourceType || action || userSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setResourceType(''); setAction(''); setUserSearch(''); }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audit entries</h3>
              <p className="text-muted-foreground text-sm">Actions taken through the UI will be recorded here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Time</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Action</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Resource</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">ID</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">User</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <LogRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>

              {/* Infinite-scroll sentinel — invisible, triggers fetchNextPage
                  when it scrolls near the viewport (see rootMargin above). */}
              <div ref={sentinelRef} className="h-1" />

              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more…
                  </span>
                ) : !hasNextPage ? (
                  <span>Showing all {total} {total === 1 ? 'entry' : 'entries'}</span>
                ) : (
                  <span>{items.length} of {total} loaded — scroll for more</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
