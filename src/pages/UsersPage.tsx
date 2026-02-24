import { useState } from 'react';
import { Users, Plus, Building2, Shield, MoreHorizontal, Loader2, Trash2, KeyRound } from 'lucide-react';
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
  DropdownMenuSeparator,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useGatewayUsers, type GatewayUserCreate } from '@/hooks/useGatewayUsers';
import { useRBACRoles } from '@/hooks/useRBACRoles';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<string | null>(null);
  const [isResetPwOpen, setIsResetPwOpen] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedRBACRole, setSelectedRBACRole] = useState('');

  // Form state for create
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formPassword, setFormPassword] = useState('');

  const { users, isLoading, error, createUser, updateUser, deleteUser, resetPassword, assignRBACRole } = useGatewayUsers();
  const { roles: rbacRoles } = useRBACRoles();
  const { toast } = useToast();

  const resetCreateForm = () => {
    setFormName('');
    setFormEmail('');
    setFormOrg('');
    setFormRole('user');
    setFormPassword('');
  };

  const handleCreateUser = async () => {
    if (!formName || !formEmail) return;
    const payload: GatewayUserCreate = {
      name: formName,
      email: formEmail,
      role: formRole,
      organization_name: formOrg || undefined,
    };
    if (formPassword) payload.password = formPassword;

    try {
      const result = await createUser.mutateAsync(payload);
      const autoPassword = !formPassword && result && 'generated_password' in (result as Record<string, unknown>)
        ? (result as Record<string, unknown>).generated_password as string
        : null;

      toast({
        title: 'User created',
        description: autoPassword
          ? `Auto-generated password: ${autoPassword}`
          : `User "${formName}" created successfully`,
      });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create user' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser.mutateAsync(userId);
      toast({ title: 'Deleted', description: 'User has been deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete this user' });
    } finally {
      setIsDeleteOpen(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword) return;
    try {
      await resetPassword.mutateAsync({ userId, new_password: newPassword });
      toast({ title: 'Password reset', description: 'New password has been set' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset password' });
    } finally {
      setIsResetPwOpen(null);
      setNewPassword('');
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!selectedRBACRole) return;
    try {
      await assignRBACRole.mutateAsync({ userId, role_id: selectedRBACRole });
      toast({ title: 'Role assigned', description: `RBAC role updated` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign role' });
    } finally {
      setIsRoleDialogOpen(null);
      setSelectedRBACRole('');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await updateUser.mutateAsync({ userId, role: newRole });
      toast({ title: 'Role updated', description: `User role changed to ${newRole}` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role' });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Users</h1>
          <p className="page-description">
            Manage technical contacts and federation operators
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
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
                <Input id="name" placeholder="John Smith" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.org" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" placeholder="Example University" value={formOrg} onChange={(e) => setFormOrg(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input id="password" type="password" placeholder="Leave blank to auto-generate" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Legacy Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
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
              <Button onClick={handleCreateUser} disabled={!formName || !formEmail || createUser.isPending}>
                {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                        ? 'The backend does not expose a user listing endpoint.'
                        : 'Click "Add User" to create the first account.'}
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
                      <DropdownMenuItem onSelect={() => handleChangeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                        <Shield className="w-4 h-4 mr-2" />
                        {user.role === 'admin' ? 'Demote to Contact' : 'Promote to Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setIsRoleDialogOpen(user.id); setSelectedRBACRole(''); }}>
                        <Users className="w-4 h-4 mr-2" />
                        Assign RBAC Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setIsResetPwOpen(user.id); setNewPassword(''); }}>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => setIsDeleteOpen(user.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
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

      {/* Delete confirmation */}
      <AlertDialog open={!!isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user will lose access to the gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => isDeleteOpen && handleDeleteUser(isDeleteOpen)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password dialog */}
      <Dialog open={!!isResetPwOpen} onOpenChange={(open) => { if (!open) { setIsResetPwOpen(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPwOpen(null)}>Cancel</Button>
            <Button onClick={() => isResetPwOpen && handleResetPassword(isResetPwOpen)} disabled={!newPassword || resetPassword.isPending}>
              {resetPassword.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign RBAC role dialog */}
      <Dialog open={!!isRoleDialogOpen} onOpenChange={(open) => { if (!open) { setIsRoleDialogOpen(null); setSelectedRBACRole(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign RBAC Role</DialogTitle>
            <DialogDescription>Select a role to assign to this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>RBAC Role</Label>
              <Select value={selectedRBACRole} onValueChange={setSelectedRBACRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {rbacRoles.map((r) => (
                    <SelectItem key={r.role_id} value={r.role_id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(null)}>Cancel</Button>
            <Button onClick={() => isRoleDialogOpen && handleAssignRole(isRoleDialogOpen)} disabled={!selectedRBACRole || assignRBACRole.isPending}>
              {assignRBACRole.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
