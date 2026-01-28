import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  ChevronDown,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTypeBadge } from '@/components/ui/entity-type-badge';
import type { EntityStatus, EntityType } from '@/types/registry';
import { useEntities } from '@/hooks/useEntities';
import { Loader2 } from 'lucide-react';

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntityStatus | 'all'>('all');
  
  const { entities, isLoading } = useEntities();

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = 
      entity.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.organizationName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status in OAS might be strict string, assume mapping matches or is string
    const matchesStatus = statusFilter === 'all' || entity.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Leaf Entities</h1>
          <p className="page-description">
            Manage registered RPs and OPs in the federation
          </p>
        </div>
        <Button asChild>
          <Link to="/entities/register">
            <Plus className="w-4 h-4 mr-2" />
            Register Entity
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity ID, name, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EntityStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Building2 className="w-10 h-10 mb-2 opacity-30" />
                    <p>No entities found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntities.map((entity) => (
                <TableRow key={entity.id} className="group">
                  <TableCell>
                    <Link 
                      to={`/entities/${entity.id}`}
                      className="block"
                    >
                      <div className="font-medium group-hover:text-accent transition-colors">
                        {entity.displayName || entity.entityId}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-[280px]">
                        {entity.entityId}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {entity.entityTypes.map((type) => (
                        <EntityTypeBadge key={type} type={type} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={entity.status as EntityStatus} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/entities/${entity.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Entity Config
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <p>Showing {filteredEntities.length} of {mockEntities.length} entities</p>
      </div>
    </div>
  );
}
