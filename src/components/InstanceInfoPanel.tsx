/**
 * Instance Info Panel
 *
 * Shows real, live facts about the connected federation instance — version,
 * signing key, which protocol endpoints are actually advertised — pulled
 * from the instance's own entity configuration statement
 * (GET /api/v1/admin/entity-configuration). Replaces the old
 * "Backend Information" card, which described our own gateway (hardcoded
 * "FastAPI Reference Implementation 0.2.0") rather than the connected
 * instance, and duplicated the sidebar's implementation badge.
 */
import { Server, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityConfiguration } from '@/hooks/useEntityConfiguration';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { formatExpiryRelative } from '@/lib/jwt-utils';

const ENDPOINT_FIELDS = [
  { claim: 'federation_fetch_endpoint', label: 'Fetch' },
  { claim: 'federation_list_endpoint', label: 'List' },
  { claim: 'federation_resolve_endpoint', label: 'Resolve' },
  { claim: 'federation_trust_mark_endpoint', label: 'Trust Mark' },
  { claim: 'federation_trust_mark_status_endpoint', label: 'TM Status' },
  { claim: 'federation_trust_mark_list_endpoint', label: 'TM List' },
  { claim: 'federation_historical_keys_endpoint', label: 'Historical Keys' },
] as const;

export function InstanceInfoPanel() {
  const { activeTrustAnchor } = useTrustAnchor();
  const { entityConfiguration, configLoading } = useEntityConfiguration();

  if (configLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Instance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading instance configuration…</p>
        </CardContent>
      </Card>
    );
  }

  const config = entityConfiguration as Record<string, unknown> | undefined;
  if (!config) return null;

  const version = typeof config.lighthouse_version === 'string' ? config.lighthouse_version : undefined;
  const jwks = config.jwks as { keys?: { alg?: string }[] } | undefined;
  const keys = jwks?.keys ?? [];
  const algs = Array.from(new Set(keys.map(k => k.alg).filter(Boolean)));
  const fedEntity = (config.metadata as any)?.federation_entity as Record<string, unknown> | undefined;
  const exp = typeof config.exp === 'number' ? config.exp : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Instance
        </CardTitle>
        <CardDescription className="truncate">
          {activeTrustAnchor?.name} — <span className="font-mono">{String(config.sub ?? '')}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-1.5 text-sm">
          {version && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">LightHouse version</dt>
              <dd className="font-medium">{version}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              Signing
            </dt>
            <dd className="font-medium">
              {algs.length > 0 ? algs.join(', ') : '—'} · {keys.length} key{keys.length === 1 ? '' : 's'}
            </dd>
          </div>
          {exp && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entity statement</dt>
              <dd className="font-medium">{formatExpiryRelative(exp)}</dd>
            </div>
          )}
        </dl>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Live Protocol Endpoints
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ENDPOINT_FIELDS.map(({ claim, label }) => {
              const live = typeof fedEntity?.[claim] === 'string';
              return (
                <Badge
                  key={claim}
                  variant="outline"
                  className={
                    live
                      ? 'gap-1 bg-green-500/10 text-green-700 border-green-300 dark:text-green-400'
                      : 'gap-1 text-muted-foreground'
                  }
                  title={live ? String(fedEntity![claim]) : `${label} endpoint not advertised`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
