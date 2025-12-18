import { useState, useEffect, useMemo } from 'react';
import { Eye, Edit, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, SearchBar, FilterSelect, SortButton } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SkeletonRow } from '@/components/shared/Skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { Drawer } from '@/components/shared/Drawer';
import { ErrorState, EmptyState } from '@/components/shared/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';
import { Certificate } from '@/types';
import certificatesData from '@/data/certificates.json';
import { toast } from '@/hooks/use-toast';

const CACHE_KEY = 'certificates-cache';

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editName, setEditName] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check localStorage cache first
        const cached = localStorage.getItem(CACHE_KEY);
        
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 600));
        
        if (cached) {
          setCertificates(JSON.parse(cached));
        } else {
          // Load from JSON and save to localStorage
          const data = certificatesData as Certificate[];
          setCertificates(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
      } catch (err) {
        setError('Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save to localStorage when certificates change (after initial load)
  useEffect(() => {
    if (certificates.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(certificates));
    }
  }, [certificates]);

  // Get unique domains for filter
  const domains = useMemo(() => {
    const uniqueDomains = [...new Set(certificates.map((c) => c.domain))];
    return [{ value: 'all', label: 'All Domains' }, ...uniqueDomains.map((d) => ({ value: d, label: d }))];
  }, [certificates]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...certificates];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.domain.toLowerCase().includes(query) ||
          c.issuer.toLowerCase().includes(query)
      );
    }

    if (domainFilter !== 'all') {
      result = result.filter((c) => c.domain === domainFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [certificates, debouncedSearch, domainFilter, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, domainFilter, pageSize]);

  const handleEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setEditName(cert.name);
  };

  const handleSaveEdit = () => {
    if (editingCert && editName.trim()) {
      const updated = certificates.map((c) =>
        c.id === editingCert.id ? { ...c, name: editName.trim() } : c
      );
      setCertificates(updated);
      setEditingCert(null);
      toast({
        title: "Certificate Updated",
        description: `"${editName.trim()}" has been updated successfully.`,
      });
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Manage your SSL/TLS certificates"
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search certificates..."
        />
        <FilterSelect
          value={domainFilter}
          onChange={setDomainFilter}
          options={domains}
          placeholder="Filter by domain"
        />
        <SortButton
          direction={sortDirection}
          onToggle={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
          label="Expiry"
        />
      </PageHeader>

      <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Domain</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Issuer</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Expiry Date</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No certificates found"
                    description="Try adjusting your search or filters"
                    icon={Shield}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((cert, index) => (
                <tr
                  key={cert.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{cert.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-muted-foreground">{cert.domain}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cert.issuer}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cert.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(cert.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCert(cert)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cert)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && filteredData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredData.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* View Modal */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Certificate Details</DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedCert.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={selectedCert.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Domain</Label>
                  <p className="font-mono text-sm">{selectedCert.domain}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Issuer</Label>
                  <p>{selectedCert.issuer}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Algorithm</Label>
                  <p className="font-mono text-sm">{selectedCert.algorithm}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Expiry Date</Label>
                  <p>{new Date(selectedCert.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Serial Number</Label>
                <p className="font-mono text-sm break-all">{selectedCert.serialNumber}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Drawer */}
      <Drawer
        isOpen={!!editingCert}
        onClose={() => setEditingCert(null)}
        title="Edit Certificate"
      >
        {editingCert && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="cert-name">Certificate Name</Label>
              <Input
                id="cert-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Domain (read-only)</Label>
              <p className="font-mono text-sm mt-1">{editingCert.domain}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Issuer (read-only)</Label>
              <p className="mt-1">{editingCert.issuer}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingCert(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
