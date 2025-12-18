import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  level: 'high' | 'medium' | 'low';
  className?: string;
}

const trustConfig = {
  high: {
    label: 'High',
    className: 'trust-high',
  },
  medium: {
    label: 'Medium',
    className: 'trust-medium',
  },
  low: {
    label: 'Low',
    className: 'trust-low',
  },
};

export function TrustBadge({ level, className }: TrustBadgeProps) {
  const config = trustConfig[level];

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
