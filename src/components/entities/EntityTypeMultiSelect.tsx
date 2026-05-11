import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type EntityType =
  | 'openid_provider'
  | 'openid_relying_party'
  | 'federation_entity'
  | 'oauth_authorization_server'
  | 'oauth_client'
  | 'oauth_resource';

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  openid_provider: 'OpenID Provider',
  openid_relying_party: 'Relying Party',
  federation_entity: 'Federation Entity',
  oauth_authorization_server: 'OAuth Authorization Server',
  oauth_client: 'OAuth Client',
  oauth_resource: 'OAuth Resource',
};

const ALL_ENTITY_TYPES: EntityType[] = [
  'openid_provider',
  'openid_relying_party',
  'federation_entity',
  'oauth_authorization_server',
  'oauth_client',
  'oauth_resource',
];

interface EntityTypeMultiSelectProps {
  selected: EntityType[];
  onChange: (types: EntityType[]) => void;
}

export function EntityTypeMultiSelect({ selected, onChange }: EntityTypeMultiSelectProps) {
  const toggle = (type: EntityType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {ALL_ENTITY_TYPES.map((type) => {
        const id = `entity-type-${type}`;
        return (
          <div key={type} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={selected.includes(type)}
              onCheckedChange={() => toggle(type)}
            />
            <Label htmlFor={id} className="cursor-pointer font-normal">
              {ENTITY_TYPE_LABELS[type]}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
