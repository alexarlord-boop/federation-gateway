import { Link } from 'react-router-dom';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTrustMarkTypes } from '@/hooks/useTrustMarkTypes';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Picks a trust mark type from the federation's own registered types
 * (Federation Trust Marks → Types) — used anywhere the caller is about to
 * act as *issuer* for a type (issuance specs, self-issued marks), where the
 * type must already be registered or the mark silently fails to resolve
 * over the public protocol later.
 *
 * Not used for the "Type + Issuer" self-trust-mark mode, where the type
 * belongs to an external federation and isn't expected to be in our own
 * registry.
 */
export function TrustMarkTypeSelect({ id, value, onChange, disabled }: Props) {
  const { trustMarkTypes, isLoading } = useTrustMarkTypes();

  if (!isLoading && trustMarkTypes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground border rounded-md px-3 py-2">
        No trust mark types registered yet.{' '}
        <Link to="/trust-marks?tab=federation" className="text-accent hover:underline">
          Create one in Federation Trust Marks → Types
        </Link>{' '}
        first.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={isLoading ? 'Loading types…' : 'Select a trust mark type…'} />
      </SelectTrigger>
      <SelectContent>
        {trustMarkTypes.map((t) => (
          <SelectItem key={t.id} value={String(t.trust_mark_type)}>
            {t.trust_mark_type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
