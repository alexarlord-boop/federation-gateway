import { cn } from '@/lib/utils';
import type { EntityStatus } from '@/types/registry';

interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
}

const statusConfig: Record<EntityStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  pending: {
    label: 'Pending',
    className: 'bg-pending/10 text-pending border border-pending/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success border border-success/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border border-destructive/30',
  },
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success border border-success/30',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground border border-muted',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
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
