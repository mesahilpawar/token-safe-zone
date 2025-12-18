import { useState, useEffect, useMemo } from 'react';
import { Key, ChevronDown, ChevronRight, Server } from 'lucide-react';
import { PageHeader, SearchBar, FilterSelect, SortButton } from '@/components/shared/PageHeader';
import { TrustBadge } from '@/components/shared/TrustBadge';
import { SkeletonRow } from '@/components/shared/Skeleton';
import { ErrorState, EmptyState } from '@/components/shared/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';
import { SSHKey } from '@/types';
import sshKeysData from '@/data/ssh-keys.json';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'ssh-keys-cache';

export default function SSHKeys() {
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [trustFilter, setTrustFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        await new Promise((resolve) => setTimeout(resolve, 600));
        
        if (cached) {
          setSSHKeys(JSON.parse(cached));
        } else {
          const data = sshKeysData as SSHKey[];
          setSSHKeys(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
      } catch (err) {
        setError('Failed to load SSH keys');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const trustOptions = [
    { value: 'all', label: 'All Trust Levels' },
    { value: 'high', label: 'High Trust' },
    { value: 'medium', label: 'Medium Trust' },
    { value: 'low', label: 'Low Trust' },
  ];

  const filteredData = useMemo(() => {
    let result = [...sshKeys];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (k) =>
          k.owner.toLowerCase().includes(query) ||
          k.fingerprint.toLowerCase().includes(query)
      );
    }

    if (trustFilter !== 'all') {
      result = result.filter((k) => k.trustLevel === trustFilter);
    }

    const trustOrder = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      const orderA = trustOrder[a.trustLevel];
      const orderB = trustOrder[b.trustLevel];
      return sortDirection === 'desc' ? orderB - orderA : orderA - orderB;
    });

    return result;
  }, [sshKeys, debouncedSearch, trustFilter, sortDirection]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      <PageHeader
        title="SSH Keys"
        description="Manage SSH key access and permissions"
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by owner or fingerprint..."
        />
        <FilterSelect
          value={trustFilter}
          onChange={setTrustFilter}
          options={trustOptions}
          placeholder="Trust Level"
        />
        <SortButton
          direction={sortDirection}
          onToggle={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
          label="Trust"
        />
      </PageHeader>

      <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fingerprint</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Used</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Trust Level</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Key Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No SSH keys found"
                    description="Try adjusting your search or filters"
                    icon={Key}
                  />
                </td>
              </tr>
            ) : (
              filteredData.map((key, index) => {
                const isExpanded = expandedRows.has(key.id);
                return (
                  <>
                    <tr
                      key={key.id}
                      className={cn(
                        "border-b border-border hover:bg-muted/30 transition-colors cursor-pointer",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={() => toggleRow(key.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{key.owner}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground truncate block max-w-[300px]">
                          {key.fingerprint}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(key.lastUsed)}
                      </td>
                      <td className="px-4 py-3">
                        <TrustBadge level={key.trustLevel} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-muted-foreground">{key.keyType}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${key.id}-expanded`} className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="pl-8 animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                              <Server className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">Associated Servers</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {key.servers.map((server) => (
                                <span
                                  key={server}
                                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-mono"
                                >
                                  {server}
                                </span>
                              ))}
                            </div>
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
      </div>
    </div>
  );
}
