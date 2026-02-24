import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Shield, Users, Lock, Settings, Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { useCapabilities } from '@/contexts/CapabilityContext';
import { useRBACFeatures } from '@/hooks/useRBACFeatures';
import { useRBACRoles, type RBACRole } from '@/hooks/useRBACRoles';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useToast } from '@/hooks/use-toast';

export default function RBACManagementPage() {
  const { capabilities } = useCapabilities();
  const { features: featureConfigs, toggleFeature } = useRBACFeatures();
  const { roles, isLoading: isRolesLoading, createRole, updateRole, deleteRole, assignPermission, removePermission } = useRBACRoles();
  const { permissions: allPermissions, isLoading: isPermsLoading } = useRBACPermissions();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSavingFeature, setIsSavingFeature] = useState<string | null>(null);

  // Create role dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Edit role dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState('');
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  if (!capabilities) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p className="text-muted-foreground">Loading RBAC configuration…</p>
      </div>
    );
  }

  const features = Object.entries(capabilities.features || {});
  const featureStateMap = new Map(featureConfigs.map((cfg) => [cfg.feature_name, cfg]));
  const activeRole = roles.find((r) => r.role_id === selectedRole) ?? null;

  // Group all permissions by feature for the permission matrix
  const permissionsByFeature = new Map<string, { feature: string; operation: string }[]>();
  for (const p of allPermissions) {
    const list = permissionsByFeature.get(p.feature) ?? [];
    list.push({ feature: p.feature, operation: p.operation });
    permissionsByFeature.set(p.feature, list);
  }

  // ── Handlers ──

  const handleToggleFeature = async (featureName: string, enabled: boolean) => {
    setIsSavingFeature(featureName);
    try {
      await toggleFeature.mutateAsync({
        featureName,
        enabled,
        reason: enabled ? null : 'Disabled by administrator',
      });
      toast({ title: enabled ? 'Enabled' : 'Disabled', description: `Feature "${featureName}" updated` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to toggle feature' });
    } finally {
      setIsSavingFeature(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleId || !newRoleName) return;
    try {
      await createRole.mutateAsync({ role_id: newRoleId, name: newRoleName, description: newRoleDesc || null });
      toast({ title: 'Created', description: `Role "${newRoleName}" created` });
      setIsCreateOpen(false);
      setNewRoleId('');
      setNewRoleName('');
      setNewRoleDesc('');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create role' });
    }
  };

  const handleUpdateRole = async () => {
    if (!editRoleId) return;
    try {
      await updateRole.mutateAsync({ roleId: editRoleId, name: editRoleName || undefined, description: editRoleDesc });
      toast({ title: 'Updated', description: 'Role updated' });
      setIsEditOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole.mutateAsync(roleId);
      if (selectedRole === roleId) setSelectedRole(null);
      toast({ title: 'Deleted', description: 'Role deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Builtin roles cannot be deleted' });
    }
  };

  const handleTogglePermission = async (roleId: string, feature: string, operation: string, has: boolean) => {
    try {
      if (has) {
        await removePermission.mutateAsync({ roleId, feature, operation });
      } else {
        await assignPermission.mutateAsync({ roleId, feature, operation });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update permission' });
    }
  };

  const openEditDialog = (role: RBACRole) => {
    setEditRoleId(role.role_id);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description ?? '');
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">RBAC Management</h1>
        <p className="text-muted-foreground">
          Manage roles, permissions, and feature availability
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ ROLES TAB ═══════════ */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>Manage user roles and their permissions</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Role</DialogTitle>
                    <DialogDescription>Define a new role that can be assigned to users</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleId">Role ID</Label>
                      <Input id="roleId" placeholder="e.g. auditor" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Unique machine-readable identifier (lowercase, no spaces)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleName">Display Name</Label>
                      <Input id="roleName" placeholder="e.g. Auditor" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleDesc">Description</Label>
                      <Input id="roleDesc" placeholder="What this role is for" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRole} disabled={!newRoleId || !newRoleName || createRole.isPending}>
                      {createRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isRolesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : roles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No roles defined yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => (
                    <Card
                      key={role.role_id}
                      className={`cursor-pointer transition-colors ${
                        selectedRole === role.role_id ? 'border-primary' : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedRole(role.role_id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            {role.builtin && <Badge variant="secondary">Built-in</Badge>}
                          </div>
                        </div>
                        <CardDescription>{role.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {!role.builtin && (
                              <>
                                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openEditDialog(role); }}>
                                  <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete &quot;{role.name}&quot;? Users with this role will lose their permissions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteRole(role.role_id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Role Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Role</DialogTitle>
                <DialogDescription>Update role name and description</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={editRoleName} onChange={(e) => setEditRoleName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editRoleDesc} onChange={(e) => setEditRoleDesc(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateRole} disabled={updateRole.isPending}>
                  {updateRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Permission Assignment for selected role */}
          {activeRole && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {activeRole.name} — Permission Assignment
                </CardTitle>
                <CardDescription>
                  Check or uncheck permissions to assign/revoke them for this role.
                  {activeRole.builtin && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      Builtin roles can still have permissions adjusted.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPermsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-6">
                    {Array.from(permissionsByFeature.entries()).map(([feature, perms]) => (
                      <div key={feature} className="space-y-2">
                        <h4 className="font-semibold capitalize text-sm">{feature.replace(/_/g, ' ')}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {perms.map((p) => {
                            const permString = `${p.feature}:${p.operation}`;
                            const hasPerm = activeRole.permissions.includes(permString);
                            return (
                              <label
                                key={permString}
                                className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={hasPerm}
                                  onCheckedChange={() =>
                                    handleTogglePermission(activeRole.role_id, p.feature, p.operation, hasPerm)
                                  }
                                />
                                <code className="text-xs">{p.operation}</code>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════ PERMISSIONS TAB ═══════════ */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Permissions</CardTitle>
              <CardDescription>
                {allPermissions.length} permissions generated from backend features (auto-seeded from OpenAPI spec)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPermsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {Array.from(permissionsByFeature.entries()).map(([feature, perms]) => (
                    <div key={feature} className="space-y-2">
                      <h3 className="font-semibold capitalize">{feature.replace(/_/g, ' ')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => (
                          <Badge key={`${p.feature}:${p.operation}`} variant="outline" className="font-mono">
                            {p.feature}:{p.operation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cross-reference: which role has which permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Role / Permission Matrix</CardTitle>
              <CardDescription>Quick overview of which roles have access to which feature groups</CardDescription>
            </CardHeader>
            <CardContent>
              {isRolesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Feature</th>
                        {roles.map((r) => (
                          <th key={r.role_id} className="text-center p-2 font-medium whitespace-nowrap">{r.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(permissionsByFeature.keys()).map((feature) => (
                        <tr key={feature} className="border-b">
                          <td className="p-2 capitalize font-medium">{feature.replace(/_/g, ' ')}</td>
                          {roles.map((role) => {
                            const featurePerms = permissionsByFeature.get(feature) ?? [];
                            const assignedCount = featurePerms.filter((p) =>
                              role.permissions.includes(`${p.feature}:${p.operation}`)
                            ).length;
                            const total = featurePerms.length;
                            return (
                              <td key={role.role_id} className="text-center p-2">
                                {assignedCount === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : assignedCount === total ? (
                                  <Badge variant="default" className="text-xs">All</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">{assignedCount}/{total}</Badge>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ FEATURES TAB ═══════════ */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Enable or disable features for this backend instance. Disabled features hide the corresponding
                UI sections for all users regardless of their role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map(([featureName, capabilityFeature]) => {
                  const feature = featureStateMap.get(featureName);
                  const enabled = feature?.enabled ?? capabilityFeature.enabled;
                  const reason = feature?.reason ?? capabilityFeature.reason;
                  const operations = feature?.operations ?? capabilityFeature.operations ?? [];

                  return (
                    <div key={featureName} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold capitalize">{featureName.replace(/_/g, ' ')}</h3>
                          <Badge variant={enabled ? 'default' : 'secondary'}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {operations.map((op) => (
                            <Badge key={op} variant="outline" className="text-xs">{op}</Badge>
                          ))}
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        disabled={isSavingFeature === featureName}
                        onCheckedChange={(checked) => handleToggleFeature(featureName, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">How Feature Flags Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>High-Level RBAC:</strong> Features can be enabled or disabled at the backend level.
                When a feature is disabled, its UI sections are hidden for all users regardless of role.
              </p>
              <p>
                <strong>Low-Level RBAC:</strong> Within enabled features, individual permissions (e.g.
                &quot;subordinates:create&quot;) are assigned to roles. Users only see actions they have permission for.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
