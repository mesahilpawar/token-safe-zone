import { cn } from '@/lib/utils';

interface SkeletonRowProps {
  columns: number;
  className?: string;
}

export function SkeletonRow({ columns, className }: SkeletonRowProps) {
  return (
    <tr className={cn('border-b border-border', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full max-w-[200px] rounded bg-muted animate-skeleton" />
        </td>
      ))}
    </tr>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-muted animate-skeleton" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded bg-muted animate-skeleton" />
          <div className="h-3 w-1/2 rounded bg-muted animate-skeleton" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-skeleton" />
        <div className="h-3 w-2/3 rounded bg-muted animate-skeleton" />
      </div>
    </div>
  );
}
