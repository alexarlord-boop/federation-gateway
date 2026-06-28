import { cn } from '@/lib/utils';
export type EntityType = 'openid_provider' | 'openid_relying_party' | 'federation_entity' | 'oauth_authorization_server' | 'oauth_client' | 'oauth_resource';

// Compile-time guard: this assignment fails if ALL_ENTITY_TYPES omits any EntityType member.
const _exhaustiveCheck: Record<EntityType, true> = {
  openid_provider: true,
  openid_relying_party: true,
  federation_entity: true,
  oauth_authorization_server: true,
  oauth_client: true,
  oauth_resource: true,
};

export const ALL_ENTITY_TYPES: EntityType[] = Object.keys(_exhaustiveCheck) as EntityType[];

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
    label: 'OAuth Authorization Server',
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

/** Full display labels — single source of truth for all surfaces. */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = Object.fromEntries(
  ALL_ENTITY_TYPES.map((t) => [t, typeConfig[t].label]),
) as Record<EntityType, string>;

export function EntityTypeBadge({ type, className, showFederationEntity = false }: EntityTypeBadgeProps) {
  // Hide FE badges by default since every entity in the registry is a Federation Entity
  if (type === 'federation_entity' && !showFederationEntity) {
    return null;
  }

  const config = typeConfig[type] ?? {
    label: type,
    short: type.split('_').map((w) => w[0]?.toUpperCase() ?? '').join(''),
    className: 'bg-muted text-muted-foreground border border-muted',
  };

  return (
    <span
      className={cn('entity-badge', config.className, className)}
      title={config.label}
    >
      {config.short}
    </span>
  );
}

/**
 * Derives human-readable role badges from the full list of registered entity types.
 * - Pure federation_entity (no protocol type) → "Intermediate"
 * - Any protocol types present → show those, skip federation_entity
 */
export function EntityRoleBadges({ types, className }: { types: string[]; className?: string }) {
  const isIntermediateOnly = types.length > 0 && types.every(t => t === 'federation_entity');

  if (isIntermediateOnly) {
    return (
      <span
        className={cn('entity-badge bg-primary/10 text-primary border border-primary/30', className)}
        title="Intermediate — federation-only node with no protocol role"
      >
        Intermediate
      </span>
    );
  }

  return (
    <>
      {types
        .filter(t => t !== 'federation_entity')
        .map(t => (
          <EntityTypeBadge key={t} type={t as EntityType} className={className} />
        ))}
    </>
  );
}
