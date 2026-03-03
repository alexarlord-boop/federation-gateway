import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  decodeTrustMarkJwt,
  getTrustMarkValidity,
  type ValidityStatus,
} from '@/lib/jwt-utils';

interface ValidityBadgeProps {
  /** If provided, the JWT is decoded to determine validity. */
  jwt?: string;
  /** If provided, overrides JWT-based computation. */
  status?: ValidityStatus;
}

export function ValidityBadge({ jwt, status: explicitStatus }: ValidityBadgeProps) {
  const status: ValidityStatus =
    explicitStatus ?? getTrustMarkValidity(jwt ? decodeTrustMarkJwt(jwt) : null);

  type Cfg = { label: string; className: string; Icon: React.ComponentType<{ className?: string }> };
  const cfg: Record<ValidityStatus, Cfg> = {
    valid: {
      label: 'Valid',
      className: 'bg-green-500/15 text-green-700 border-green-300 dark:text-green-400',
      Icon: CheckCircle2,
    },
    expired: {
      label: 'Expired',
      className: 'bg-destructive/15 text-destructive border-destructive/30',
      Icon: XCircle,
    },
    'expiring-soon': {
      label: 'Expiring Soon',
      className: 'bg-amber-400/15 text-amber-700 border-amber-300 dark:text-amber-400',
      Icon: AlertTriangle,
    },
    unknown: {
      label: 'No Expiry',
      className: 'bg-muted text-muted-foreground',
      Icon: HelpCircle,
    },
  };

  const { label, className, Icon } = cfg[status];
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
