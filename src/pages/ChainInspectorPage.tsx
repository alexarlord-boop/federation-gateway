import { useState } from 'react';
import { Search, Link2, ShieldCheck, AlertCircle, Loader2, ClipboardCopy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { GATEWAY_BASE } from '@/lib/api-config';
import { gatewayFetch } from '@/lib/gateway-fetch';
import JsonView from '@uiw/react-json-view';

// ── JWT decode (client-side, no verification) ───────────────────────────────

function b64pad(s: string) {
  return s + '='.repeat((4 - (s.length % 4)) % 4);
}

function decodeJwt(token: string): { header: unknown; payload: unknown; raw: string } | null {
  try {
    const parts = token.trim().split('.');
    if (parts.length < 2) return null;
    const header = JSON.parse(atob(b64pad(parts[0].replace(/-/g, '+').replace(/_/g, '/'))));
    const payload = JSON.parse(atob(b64pad(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));
    return { header, payload, raw: token.trim() };
  } catch {
    return null;
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** The /fetch and /resolve endpoints return raw JWT text, not JSON. */
async function fetchPublicEndpoint(instanceId: string, path: string): Promise<string> {
  const url = `${GATEWAY_BASE}/api/v1/proxy/${encodeURIComponent(instanceId)}${path}`;

  // We need raw text (JWT), not JSON — call fetch directly with auth header
  const { getAccessToken, ensureValidToken } = await import('@/lib/token-manager');
  const token = await ensureValidToken() ?? getAccessToken();

  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 300)}`);
  }
  return resp.text();
}

// ── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1 text-xs">
      {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy JWT'}
    </Button>
  );
}

// ── JwtResult ────────────────────────────────────────────────────────────────

function JwtResult({ jwt, label }: { jwt: string; label: string }) {
  const decoded = decodeJwt(jwt);

  if (!decoded) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Could not decode response as a JWT.
        <pre className="mt-2 text-xs break-all whitespace-pre-wrap opacity-70">{jwt}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <CopyButton text={decoded.raw} />
      </div>
      <Tabs defaultValue="payload">
        <TabsList className="h-8">
          <TabsTrigger value="payload" className="text-xs">Payload</TabsTrigger>
          <TabsTrigger value="header" className="text-xs">Header</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">Raw JWT</TabsTrigger>
        </TabsList>
        <TabsContent value="payload">
          <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-96">
            <JsonView value={decoded.payload as object} collapsed={2} style={{ fontSize: 12 }} />
          </div>
        </TabsContent>
        <TabsContent value="header">
          <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-48">
            <JsonView value={decoded.header as object} style={{ fontSize: 12 }} />
          </div>
        </TabsContent>
        <TabsContent value="raw">
          <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-48">
            <pre className="text-xs break-all whitespace-pre-wrap font-mono">{decoded.raw}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ChainInspectorPage() {
  const { trustAnchors } = useTrustAnchors();
  const { activeTrustAnchor } = useTrustAnchor();

  const [entityId, setEntityId] = useState('');
  const [selectedTaId, setSelectedTaId] = useState<string>(activeTrustAnchor?.id ?? '');
  const [anchorEntityId, setAnchorEntityId] = useState('');

  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  const selectedTa = (trustAnchors ?? []).find(ta => ta.id === selectedTaId);

  const handleFetch = async () => {
    if (!entityId || !selectedTaId) return;
    setFetchLoading(true);
    setFetchResult(null);
    setFetchError(null);
    try {
      const jwt = await fetchPublicEndpoint(
        selectedTaId,
        `/fetch?sub=${encodeURIComponent(entityId)}`,
      );
      setFetchResult(jwt);
    } catch (e: any) {
      setFetchError(e.message ?? String(e));
    } finally {
      setFetchLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!entityId || !selectedTaId) return;
    const anchor = anchorEntityId || selectedTa?.entityId || '';
    if (!anchor) {
      setResolveError('Anchor entity ID is required');
      return;
    }
    setResolveLoading(true);
    setResolveResult(null);
    setResolveError(null);
    try {
      const jwt = await fetchPublicEndpoint(
        selectedTaId,
        `/resolve?sub=${encodeURIComponent(entityId)}&trust_anchor=${encodeURIComponent(anchor)}`,
      );
      setResolveResult(jwt);
    } catch (e: any) {
      setResolveError(e.message ?? String(e));
    } finally {
      setResolveLoading(false);
    }
  };

  const hasResult = fetchResult || resolveResult || fetchError || resolveError;

  return (
    <div className="space-y-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trust Chain Inspector</h1>
        <p className="text-muted-foreground mt-1">
          Fetch subordinate statements and resolve trust chains for any entity registered in this federation.
        </p>
      </div>

      {/* Query form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspect Entity</CardTitle>
          <CardDescription>
            Enter an entity ID and choose which Trust Anchor to query.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TA selector */}
          <div className="grid gap-1.5">
            <Label>Trust Anchor</Label>
            <Select
              value={selectedTaId}
              onValueChange={setSelectedTaId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Trust Anchor…" />
              </SelectTrigger>
              <SelectContent>
                {(trustAnchors ?? []).map(ta => (
                  <SelectItem key={ta.id} value={ta.id}>
                    {ta.name}
                    <span className="ml-2 text-xs text-muted-foreground">{ta.entityId}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity ID input */}
          <div className="grid gap-1.5">
            <Label htmlFor="entity-id">Entity ID (subject)</Label>
            <Input
              id="entity-id"
              placeholder="https://idp.helsinki.example"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleFetch}
              disabled={!entityId || !selectedTaId || fetchLoading}
              className="gap-2"
            >
              {fetchLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Search className="h-4 w-4" />}
              Fetch Statement
            </Button>

            <Button
              variant="secondary"
              onClick={handleResolve}
              disabled={!entityId || !selectedTaId || resolveLoading}
              className="gap-2"
            >
              {resolveLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ShieldCheck className="h-4 w-4" />}
              Resolve Trust Chain
            </Button>
          </div>

          {/* Optional anchor override for /resolve */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
              Override trust anchor entity ID for resolve (optional)
            </summary>
            <div className="mt-2 grid gap-1.5">
              <Label htmlFor="anchor-id" className="text-xs text-muted-foreground">
                Anchor entity ID — defaults to the selected TA's own entity ID
              </Label>
              <Input
                id="anchor-id"
                className="h-8 text-sm"
                placeholder={selectedTa?.entityId ?? 'http://localhost:8081'}
                value={anchorEntityId}
                onChange={e => setAnchorEntityId(e.target.value)}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Quick entity shortcuts */}
      {(trustAnchors ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Demo entities</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Helsinki IDP', id: 'https://idp.helsinki.example', ta: 'ta-1' },
              { label: 'Amsterdam IDP', id: 'https://idp.amsterdam.example', ta: 'ta-1' },
              { label: 'Newcastle IDP (pending)', id: 'https://idp.newcastle.example', ta: 'ta-1' },
              { label: 'Leuven RP', id: 'https://library.leuven.example', ta: 'ta-2' },
              { label: 'SWAMID RP', id: 'https://student-portal.swamid.example', ta: 'ta-2' },
            ].map(shortcut => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => {
                  setEntityId(shortcut.id);
                  setSelectedTaId(shortcut.ta);
                  setFetchResult(null);
                  setResolveResult(null);
                  setFetchError(null);
                  setResolveError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted transition-colors"
              >
                <Link2 className="h-3 w-3 text-muted-foreground" />
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasResult && (
        <div className="space-y-4">
          {/* Fetch result */}
          {(fetchResult || fetchError) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Subordinate Statement
                  {fetchResult && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      fetched
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  {selectedTa?.entityId}/fetch?sub={entityId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fetchError ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                ) : fetchResult ? (
                  <JwtResult jwt={fetchResult} label="Statement from TA" />
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Resolve result */}
          {(resolveResult || resolveError) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Resolved Trust Chain
                  {resolveResult && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      resolved
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  {selectedTa?.entityId}/resolve?sub={entityId}&trust_anchor={anchorEntityId || selectedTa?.entityId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resolveError ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{resolveError}</p>
                      <p className="mt-1 text-xs opacity-75">
                        Note: resolve requires the subject entity to serve a live federation endpoint.
                        Demo entities use fake hostnames so LightHouse cannot fetch their self-signed statements — use Fetch Statement instead to see the TA-issued subordinate statement.
                      </p>
                    </div>
                  </div>
                ) : resolveResult ? (
                  <JwtResult jwt={resolveResult} label="Resolved trust chain" />
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
