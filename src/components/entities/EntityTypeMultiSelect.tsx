import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  type EntityType,
  ENTITY_TYPE_LABELS,
  ALL_ENTITY_TYPES,
} from '@/components/ui/entity-type-badge';

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
          <div key={type} className="flex items-start gap-2">
            <Checkbox
              id={id}
              className="mt-0.5"
              checked={selected.includes(type)}
              onCheckedChange={() => toggle(type)}
            />
            <div>
              <Label htmlFor={id} className="cursor-pointer font-normal">
                {ENTITY_TYPE_LABELS[type]}
              </Label>
              {type === 'federation_entity' && (
                <p className="text-xs text-muted-foreground leading-tight">Intermediate — federation-layer node with no protocol role</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
