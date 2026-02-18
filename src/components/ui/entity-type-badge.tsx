import { cn } from '@/lib/utils';
export type EntityType = 'openid_provider' | 'openid_relying_party' | 'federation_entity' | 'oauth_authorization_server' | 'oauth_client' | 'oauth_resource';

interface EntityTypeBadgeProps {
  type: EntityType;
  className?: string;
  showFederationEntity?: boolean;
}

const typeConfig: Record<EntityType, { label: string; short: string; className: string }> = {
  openid_provider: {
    label: 'OpenID Provider',
    short: 'OP',
    className: 'bg-info/10 text-info border border-info/30',
  },
  openid_relying_party: {
    label: 'Relying Party',
    short: 'RP',
    className: 'bg-accent/10 text-accent border border-accent/30',
  },
  federation_entity: {
    label: 'Federation Entity',
    short: 'FE',
    className: 'bg-primary/10 text-primary border border-primary/30',
  },
  oauth_authorization_server: {
    label: 'OAuth AS',
    short: 'AS',
    className: 'bg-warning/10 text-warning border border-warning/30',
  },
  oauth_client: {
    label: 'OAuth Client',
    short: 'OC',
    className: 'bg-secondary text-secondary-foreground',
  },
  oauth_resource: {
    label: 'OAuth Resource',
    short: 'RS',
    className: 'bg-muted text-muted-foreground',
  },
};

export function EntityTypeBadge({ type, className, showFederationEntity = false }: EntityTypeBadgeProps) {
  // Hide FE badges by default since every entity in the registry is a Federation Entity
  if (type === 'federation_entity' && !showFederationEntity) {
    return null;
  }
  
  const config = typeConfig[type];
  
  return (
    <span 
      className={cn('entity-badge', config.className, className)}
      title={config.label}
    >
      {config.short}
    </span>
  );
}
