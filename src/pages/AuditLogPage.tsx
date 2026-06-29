import { useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { useAuditLogs, type AuditLogEntry } from '@/hooks/useAuditLogs';

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

function LogRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(entry.created_at)}</td>
      <td className="py-3 px-4"><ActionBadge action={entry.action} /></td>
      <td className="py-3 px-4 text-sm">{entry.resource_type.replace(/_/g, ' ')}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground font-mono max-w-[200px] truncate">{entry.resource_id ?? '—'}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground">{entry.user_email ?? entry.user_id}</td>
    </tr>
  );
}

const RESOURCE_TYPES = ['subordinate', 'trust_mark_spec', 'trust_mark', 'registration'];
const ACTIONS = [
  'register', 'update_status', 'update', 'update_metadata', 'update_jwks',
  'update_constraints', 'update_policy', 'delete', 'create', 'issue', 'revoke',
  'approve', 'decline',
];
const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const { activeTrustAnchor } = useTrustAnchor();
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data, isLoading } = useAuditLogs({
    tenant_id: activeTrustAnchor?.id,
    resource_type: resourceType || undefined,
    action: action || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to view audit logs.</p>
      </div>
    );
  }

  const items = data?.items.filter((e) =>
    userSearch ? (e.user_email ?? e.user_id).toLowerCase().includes(userSearch.toLowerCase()) : true,
  ) ?? [];

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
            <Select value={resourceType} onValueChange={(v) => { setResourceType(v === '__all__' ? '' : v); setPage(1); }}>
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

            <Select value={action} onValueChange={(v) => { setAction(v === '__all__' ? '' : v); setPage(1); }}>
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
              <Button variant="ghost" size="sm" onClick={() => { setResourceType(''); setAction(''); setUserSearch(''); setPage(1); }}>
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
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <LogRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Badge variant="secondary">Page {page} of {totalPages}</Badge>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
