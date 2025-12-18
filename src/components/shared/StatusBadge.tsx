import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'expiring';
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    className: 'status-active',
  },
  expired: {
    label: 'Expired',
    className: 'status-expired',
  },
  expiring: {
    label: 'Expiring Soon',
    className: 'status-expiring',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
