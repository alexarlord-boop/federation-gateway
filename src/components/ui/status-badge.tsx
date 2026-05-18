import { cn } from '@/lib/utils';
export type EntityStatus = 'active' | 'blocked' | 'pending' | 'inactive';

interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
}

const statusConfig: Record<EntityStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success border border-success/30',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-destructive/10 text-destructive border border-destructive/30',
  },
  pending: {
    label: 'Pending',
    className: 'bg-pending/10 text-pending border border-pending/30',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground border border-muted',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status || 'Unknown',
    className: 'bg-muted text-muted-foreground border border-muted',
  };
  
  return (
    <span className={cn(
      'entity-badge',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
