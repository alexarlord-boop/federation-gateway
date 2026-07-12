import { useState } from 'react';
import {
  Search, Link2, ShieldCheck, AlertCircle, Info, Loader2, ClipboardCopy, Check, Globe, Award,
} from 'lucide-react';
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
import { decodeTrustMarkJwt, getTrustMarkTypeId } from '@/lib/jwt-utils';
import { resolveEntity, type ResolvedEntity } from '@/hooks/useExternalEntity';
import { TrustMarkVerifier } from '@/components/trust-marks/TrustMarkVerifier';
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

// ── Any-entity mode (direct, no Trust Anchor needed) ────────────────────────

/** Per OIDF §5, an entity's own configuration MAY embed trust marks it holds
 * as `trust_marks: [{ trust_mark: "<jwt>" }, ...]`. */
interface EmbeddedTrustMark {
  trust_mark?: string;
  [key: string]: unknown;
}

function AnyEntityPanel() {
  const [entityId, setEntityId] = useState('');
  const [result, setResult] = useState<ResolvedEntity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInspect = async (idOverride?: string) => {
    const id = idOverride ?? entityId;
    if (!id) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await resolveEntity(id);
      setResult(res);
      if (idOverride) setEntityId(idOverride);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const payload = result?.payload;
  const authorityHints = Array.isArray(payload?.authority_hints)
    ? (payload!.authority_hints as unknown[]).filter((h): h is string => typeof h === 'string')
    : [];
  const trustMarks = Array.isArray(payload?.trust_marks)
    ? (payload!.trust_marks as EmbeddedTrustMark[]).filter((tm) => typeof tm.trust_mark === 'string')
    : [];
  const orgName =
    (payload?.metadata as any)?.federation_entity?.organization_name as string | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspect Any Entity</CardTitle>
          <CardDescription>
            Fetches the entity's own <code className="font-mono">.well-known/openid-federation</code> statement
            directly — works for any real OpenID Federation entity, not just ones registered with this instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="any-entity-id">Entity ID</Label>
            <div className="flex gap-2">
              <Input
                id="any-entity-id"
                placeholder="https://se.swamid.oidf.lab.surf.nl"
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInspect()}
              />
              <Button onClick={() => handleInspect()} disabled={!entityId || loading} className="gap-2 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Inspect
              </Button>
            </div>
          </div>

          {/* Real testbed shortcuts — proven live entities, some with real trust marks */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Live testbed entities (testbed.oidf.lab.surf.nl)
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'eduGAIN (root TA)', id: 'https://edugain.oidf.lab.surf.nl' },
                { label: 'SWAMID (holds a real mark)', id: 'https://se.swamid.oidf.lab.surf.nl' },
                { label: 'SURFconext (holds a real mark)', id: 'https://nl.surfconext.oidf.lab.surf.nl' },
                { label: 'HAKA (holds a real mark)', id: 'https://fi.haka.oidf.lab.surf.nl' },
                { label: 'ACOnet', id: 'https://at.aconet.oidf.lab.surf.nl' },
              ].map(shortcut => (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => handleInspect(shortcut.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted transition-colors"
                >
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && payload && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Entity Configuration
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  fetched live
                </Badge>
              </CardTitle>
              {orgName && <CardDescription>{orgName}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {authorityHints.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Authority Hints — click to walk up the chain
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {authorityHints.map(hint => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => handleInspect(hint)}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted transition-colors font-mono"
                      >
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <JwtResult jwt={result.raw_jwt} label="Entity configuration statement" />
            </CardContent>
          </Card>

          {/* Trust marks held by this entity, per OIDF §5 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4" />
                Trust Marks Held
              </CardTitle>
              <CardDescription>
                Marks embedded in this entity's own configuration, each verifiable live against its issuer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trustMarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This entity's configuration doesn't embed any trust marks.
                </p>
              ) : (
                <div className="space-y-3">
                  {trustMarks.map((tm, i) => {
                    const tmPayload = decodeTrustMarkJwt(tm.trust_mark!);
                    const typeId = getTrustMarkTypeId(tmPayload);
                    return (
                      <div key={i} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-xs font-mono break-all">{typeId ?? 'unknown type'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              issued by <span className="font-mono">{tmPayload?.iss ?? '—'}</span>
                            </p>
                          </div>
                          <TrustMarkVerifier jwt={tm.trust_mark!} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Via Trust Anchor mode (existing behavior) ───────────────────────────────

function ViaTrustAnchorPanel() {
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
    const anchor = anchorEntityId || selectedTa?.entityId?.replace(/\/$/, '') || '';
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
    <div className="space-y-6">
      {/* Query form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspect Entity</CardTitle>
          <CardDescription>
            Enter an entity ID and choose which Trust Anchor to query. Only works for entities
            registered as subordinates of the selected Trust Anchor.
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
                  {(selectedTa?.entityId ?? '').replace(/\/$/, '')}/fetch?sub={entityId}
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
                  {(selectedTa?.entityId ?? '').replace(/\/$/, '')}/resolve?sub={entityId}&trust_anchor={anchorEntityId || (selectedTa?.entityId ?? '').replace(/\/$/, '')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resolveError ? (
                  resolveError.includes('invalid_trust_chain') || resolveError.includes('no valid trust path') ? (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">No trust path found</p>
                        <p className="mt-1 text-xs opacity-80">
                          LightHouse could not build a trust chain — the subject entity must serve a
                          live <code className="font-mono">/.well-known/openid-federation</code> endpoint
                          so the resolver can fetch its self-signed statement. Demo entities use fake
                          hostnames. Use <strong>Fetch Statement</strong> above to see the TA-issued
                          subordinate statement instead.
                        </p>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{resolveError}</span>
                  </div>
                  )
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

// ── Main page ────────────────────────────────────────────────────────────────

export default function ChainInspectorPage() {
  return (
    <div className="space-y-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trust Chain Inspector</h1>
        <p className="text-muted-foreground mt-1">
          Inspect any OpenID Federation entity's statement, trust chain, and trust marks —
          against this instance's own subordinates, or against any real entity on the internet.
        </p>
      </div>

      <Tabs defaultValue="any-entity">
        <TabsList>
          <TabsTrigger value="any-entity">Any Entity</TabsTrigger>
          <TabsTrigger value="via-ta">Via Trust Anchor</TabsTrigger>
        </TabsList>
        <TabsContent value="any-entity" className="mt-4">
          <AnyEntityPanel />
        </TabsContent>
        <TabsContent value="via-ta" className="mt-4">
          <ViaTrustAnchorPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
