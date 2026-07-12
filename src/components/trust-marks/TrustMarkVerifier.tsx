import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldQuestion, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { decodeTrustMarkJwt, getTrustMarkTypeId } from '@/lib/jwt-utils';
import {
  resolveEntity,
  checkTrustMarkStatus,
  getStatusEndpointFromEntity,
} from '@/hooks/useExternalEntity';

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'active' }
  | { phase: 'revoked' }
  | { phase: 'no-status-endpoint' }
  | { phase: 'error'; message: string };

/**
 * Live verification of a trust mark against the spec-defined mechanism
 * (OIDF §8.3): fetch the issuer's own entity configuration to find its
 * published `federation_trust_mark_status_endpoint`, then ask *that*
 * endpoint whether the mark is still active. No local signature check —
 * the issuer is authoritative over its own marks' status.
 */
export function TrustMarkVerifier({ jwt }: { jwt: string }) {
  const [state, setState] = useState<VerifyState>({ phase: 'idle' });
  const payload = decodeTrustMarkJwt(jwt);

  const handleVerify = async () => {
    if (!payload?.iss || !payload?.sub) {
      setState({ phase: 'error', message: 'Trust mark is missing iss or sub — cannot verify.' });
      return;
    }
    const trustMarkId = getTrustMarkTypeId(payload);
    if (!trustMarkId) {
      setState({ phase: 'error', message: 'Trust mark has no recognizable type identifier claim.' });
      return;
    }

    setState({ phase: 'checking' });
    try {
      const issuer = await resolveEntity(payload.iss);
      const statusEndpoint = getStatusEndpointFromEntity(issuer.payload);
      if (!statusEndpoint) {
        setState({ phase: 'no-status-endpoint' });
        return;
      }
      const result = await checkTrustMarkStatus({
        statusEndpoint,
        sub: payload.sub,
        trustMarkId,
        trustMarkJwt: jwt,
      });
      setState({ phase: result.active ? 'active' : 'revoked' });
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? String(err) });
    }
  };

  if (state.phase === 'idle') {
    return (
      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleVerify}>
        <ShieldCheck className="w-3.5 h-3.5" />
        Verify Live Status
      </Button>
    );
  }

  if (state.phase === 'checking') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking with issuer…
      </Badge>
    );
  }

  if (state.phase === 'active') {
    return (
      <Badge variant="outline" className="gap-1 bg-green-500/15 text-green-700 border-green-300 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Active — confirmed by issuer
      </Badge>
    );
  }

  if (state.phase === 'revoked') {
    return (
      <Badge variant="outline" className="gap-1 bg-destructive/15 text-destructive border-destructive/30">
        <XCircle className="w-3 h-3" />
        Revoked — issuer reports inactive
      </Badge>
    );
  }

  if (state.phase === 'no-status-endpoint') {
    return (
      <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground">
        <ShieldQuestion className="w-3 h-3" />
        Issuer doesn't publish a status endpoint
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1 bg-amber-400/15 text-amber-700 border-amber-300 dark:text-amber-400">
        <AlertTriangle className="w-3 h-3" />
        Could not verify
      </Badge>
      <span className="text-xs text-muted-foreground">{state.message}</span>
    </div>
  );
}
