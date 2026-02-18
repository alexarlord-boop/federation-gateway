import { useState } from 'react';
import { Users, Plus, Mail, Building2, Shield, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '@/client';
import { useToast } from '@/hooks/use-toast';

// TODO: Create a dedicated UsersService when backend exposes GET /api/v1/users
// TODO: Create user CRUD endpoints in the Auth Gateway (POST /api/v1/users, PATCH, DELETE)
interface GatewayUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_name?: string;
  status?: string;
  created_at?: string;
}

function useUsers() {
  const token = typeof OpenAPI.TOKEN === 'string' ? OpenAPI.TOKEN : undefined;
  return useQuery<GatewayUser[]>({
    queryKey: ['users', OpenAPI.BASE, token],
    queryFn: async () => {
      if (!token) return [];
      // TODO: Replace with generated service once backend endpoint exists
      const res = await fetch(`${OpenAPI.BASE}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 404) return [];
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    },
  });
}

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: users, isLoading, error } = useUsers();
  const { toast } = useToast();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Users</h1>
          <p className="page-description">
            Manage technical contacts and federation operators
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a local account for a technical contact
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.org" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" placeholder="Example University" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue="user">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Technical Contact</SelectItem>
                    <SelectItem value="admin">FedOps Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // TODO: Wire to POST /api/v1/users when backend supports it
                toast({
                  title: 'Not yet implemented',
                  description: 'User creation requires a backend user management endpoint.',
                  variant: 'destructive',
                });
                setIsCreateDialogOpen(false);
              }}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="data-table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
                </TableCell>
              </TableRow>
            ) : error || !users || users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="w-10 h-10 mb-2 opacity-30" />
                    <p>{error ? 'User management unavailable' : 'No users found'}</p>
                    <p className="text-sm">
                      {error
                        ? 'The backend does not expose a user listing endpoint yet.'
                        : 'Users will appear here once the user management API is implemented.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-accent">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.organization_name || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' ? (
                      <span className="entity-badge bg-primary/10 text-primary border border-primary/30">
                        <Shield className="w-3 h-3 mr-1" />
                        FedOps Admin
                      </span>
                    ) : (
                      <span className="entity-badge bg-secondary text-secondary-foreground">
                        Technical Contact
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`entity-badge ${
                    user.status === 'active'
                      ? 'bg-success/10 text-success border border-success/30'
                      : 'bg-pending/10 text-pending border border-pending/30'
                  }`}>
                    {user.status || 'active'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit User</DropdownMenuItem>
                      <DropdownMenuItem>Reset Password</DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invite
                      </DropdownMenuItem>
                      {user.status === 'pending' && (
                        <DropdownMenuItem>Approve Account</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">
                        Deactivate
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
    </div>
  );
}
