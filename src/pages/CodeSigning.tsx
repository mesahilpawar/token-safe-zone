import { useState, useEffect, useMemo } from 'react';
import { FileKey, Shield, Code, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, SearchBar } from '@/components/shared/PageHeader';
import { SkeletonRow, SkeletonCard } from '@/components/shared/Skeleton';
import { ErrorState, EmptyState } from '@/components/shared/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';
import { CodeSigningKey, ViewMode } from '@/types';
import codeSigningData from '@/data/code-signing.json';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'code-signing-cache';
const VIEW_MODE_KEY = 'code-signing-view-mode';

export default function CodeSigning() {
  const [keys, setKeys] = useState<CodeSigningKey[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as ViewMode) || 'table';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        await new Promise((resolve) => setTimeout(resolve, 600));
        
        if (cached) {
          setKeys(JSON.parse(cached));
        } else {
          const data = codeSigningData as CodeSigningKey[];
          setKeys(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
      } catch (err) {
        setError('Failed to load code signing keys');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const filteredData = useMemo(() => {
    if (!debouncedSearch) return keys;
    
    const query = debouncedSearch.toLowerCase();
    return keys.filter(
      (k) =>
        k.alias.toLowerCase().includes(query) ||
        k.algorithm.toLowerCase().includes(query)
    );
  }, [keys, debouncedSearch]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatLastUsed = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      <PageHeader
        title="Code Signing Keys"
        description="Manage code signing certificates and keys"
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search keys..."
        />
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('table')}
            className="rounded-none"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('grid')}
            className="rounded-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {viewMode === 'table' ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Alias</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Algorithm</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Protection</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Used</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Usage Count</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No code signing keys found"
                      description="Try adjusting your search"
                      icon={FileKey}
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((key, index) => (
                  <tr
                    key={key.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{key.alias}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-muted-foreground">{key.algorithm}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                          key.protectionLevel === 'hsm'
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {key.protectionLevel === 'hsm' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <Code className="h-3 w-3" />
                        )}
                        {key.protectionLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatLastUsed(key.lastUsed)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm text-foreground">{key.usageCount.toLocaleString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredData.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No code signing keys found"
                description="Try adjusting your search"
                icon={FileKey}
              />
            </div>
          ) : (
            filteredData.map((key, index) => (
              <div
                key={key.id}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        key.protectionLevel === 'hsm'
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {key.protectionLevel === 'hsm' ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <Code className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{key.alias}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{key.algorithm}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      key.protectionLevel === 'hsm'
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {key.protectionLevel.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-foreground">{formatDate(key.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Used</span>
                    <span className="text-foreground">{formatDate(key.lastUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usage Count</span>
                    <span className="font-mono text-foreground">{key.usageCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
