import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Shield, Users, Lock, Settings } from 'lucide-react';
import { useCapabilities } from '@/contexts/CapabilityContext';

export default function RBACManagementPage() {
  const { capabilities } = useCapabilities();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  if (!capabilities) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading RBAC configuration...</p>
      </div>
    );
  }

  const roles = capabilities.rbac?.roles || [];
  const features = Object.entries(capabilities.features || {});

  return (
    <div className="space-y-6">
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

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Manage user roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <Card
                    key={role.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRole === role.id
                        ? 'border-primary'
                        : 'hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        {role.builtin && (
                          <Badge variant="secondary">Built-in</Badge>
                        )}
                      </div>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {role.permissions?.length || 0} permissions
                          </span>
                        </div>
                        {!role.builtin && (
                          <Button variant="outline" size="sm" className="w-full">
                            Edit Role
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Create Custom Role
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions Detail */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {roles.find((r) => r.id === selectedRole)?.name} - Permissions
                </CardTitle>
                <CardDescription>
                  Permissions assigned to this role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roles
                    .find((r) => r.id === selectedRole)
                    ?.permissions?.map((perm) => {
                      const [feature, operation] = perm.split(':');
                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between p-2 rounded-md border"
                        >
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm">
                              <span className="text-primary">{feature}</span>:
                              {operation}
                            </code>
                          </div>
                          <Badge variant="outline">{operation}</Badge>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Permissions</CardTitle>
              <CardDescription>
                All permissions generated from enabled features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features
                  .filter(([_, feature]) => feature.enabled)
                  .map(([featureName, feature]) => (
                    <div key={featureName} className="space-y-2">
                      <h3 className="font-semibold capitalize">
                        {featureName.replace(/_/g, ' ')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {feature.operations?.map((operation) => (
                          <Badge
                            key={`${featureName}:${operation}`}
                            variant="outline"
                            className="font-mono"
                          >
                            {featureName}:{operation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Enable or disable features for this backend instance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map(([featureName, feature]) => (
                  <div
                    key={featureName}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold capitalize">
                          {featureName.replace(/_/g, ' ')}
                        </h3>
                        <Badge
                          variant={feature.enabled ? 'default' : 'secondary'}
                        >
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {feature.reason && (
                        <p className="text-sm text-muted-foreground">
                          {feature.reason}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {feature.operations?.map((op) => (
                          <Badge key={op} variant="outline" className="text-xs">
                            {op}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Switch
                      checked={feature.enabled}
                      disabled={!feature.enabled}
                      onCheckedChange={(checked) => {
                        // TODO: Implement feature toggle API call
                        console.log(
                          `Toggle ${featureName} to ${checked}`
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">High-Level RBAC</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Features can be enabled or disabled at the backend level. When a
                feature is disabled, its permissions are not available for
                assignment to any role, effectively hiding the feature from all
                users regardless of their role.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
