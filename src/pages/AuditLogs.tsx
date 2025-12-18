import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ClipboardList, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, FilterSelect } from '@/components/shared/PageHeader';
import { SkeletonRow } from '@/components/shared/Skeleton';
import { ErrorState, EmptyState } from '@/components/shared/ErrorState';
import { AuditLog } from '@/types';
import auditLogsData from '@/data/audit-logs.json';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

const CACHE_KEY = 'audit-logs-cache';
const PAGE_SIZE = 8;

const actionTypeColors: Record<string, string> = {
  'certificate.renew': 'bg-success/10 text-success',
  'certificate.update': 'bg-info/10 text-info',
  'certificate.download': 'bg-info/10 text-info',
  'certificate.expiry_warning': 'bg-warning/10 text-warning',
  'certificate.expired': 'bg-destructive/10 text-destructive',
  'ssh_key.create': 'bg-success/10 text-success',
  'ssh_key.revoke': 'bg-destructive/10 text-destructive',
  'ssh_key.update': 'bg-info/10 text-info',
  'ssh_key.access': 'bg-muted text-muted-foreground',
  'code_signing.sign': 'bg-primary/10 text-primary',
  'code_signing.create': 'bg-success/10 text-success',
  'code_signing.rotate': 'bg-warning/10 text-warning',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        await new Promise((resolve) => setTimeout(resolve, 600));
        
        if (cached) {
          setLogs(JSON.parse(cached));
        } else {
          const data = auditLogsData as AuditLog[];
          setLogs(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
      } catch (err) {
        setError('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const actionTypes = useMemo(() => {
    const types = [...new Set(logs.map((l) => l.actionType))];
    return [
      { value: 'all', label: 'All Actions' },
      ...types.map((t) => ({ value: t, label: t.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
    ];
  }, [logs]);

  const filteredData = useMemo(() => {
    let result = [...logs];

    if (actionTypeFilter !== 'all') {
      result = result.filter((l) => l.actionType === actionTypeFilter);
    }

    if (dateRange.from) {
      result = result.filter((l) => new Date(l.timestamp) >= dateRange.from!);
    }
    if (dateRange.to) {
      result = result.filter((l) => new Date(l.timestamp) <= dateRange.to!);
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return result;
  }, [logs, actionTypeFilter, dateRange]);

  const displayedData = filteredData.slice(0, displayCount);
  const hasMore = displayCount < filteredData.length;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading) {
        setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredData.length));
      }
    },
    [hasMore, loading, filteredData.length]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [actionTypeFilter, dateRange]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionTypeColor = (actionType: string) => {
    return actionTypeColors[actionType] || 'bg-muted text-muted-foreground';
  };

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track all system activities and changes"
      >
        <FilterSelect
          value={actionTypeFilter}
          onChange={setActionTypeFilter}
          options={actionTypes}
          placeholder="Filter by action"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
        {(dateRange.from || dateRange.to) && (
          <Button variant="ghost" size="sm" onClick={() => setDateRange({})}>
            Clear dates
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actor</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Target</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
            ) : displayedData.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No audit logs found"
                    description="Try adjusting your filters"
                    icon={ClipboardList}
                  />
                </td>
              </tr>
            ) : (
              displayedData.map((log, index) => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <>
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b border-border hover:bg-muted/30 transition-colors cursor-pointer",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={() => toggleRow(log.id)}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-foreground">{log.actor}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getActionTypeColor(log.actionType)
                          )}
                        >
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-muted-foreground">{log.targetResource}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-expanded`} className="bg-muted/10">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="pl-8 animate-fade-in">
                            <div className="text-sm font-medium text-foreground mb-2">Metadata</div>
                            <pre className="font-mono text-xs bg-background/50 p-4 rounded-lg overflow-x-auto border border-border">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>

        <div ref={observerRef} className="h-1" />

        {hasMore && (
          <div className="flex items-center justify-center py-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading more...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
