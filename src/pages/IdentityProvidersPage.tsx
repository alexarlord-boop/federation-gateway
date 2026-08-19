import { useState } from 'react';
import { Fingerprint, Plus, Globe, MoreHorizontal, Loader2, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  useOidcProviderAdmin,
  type OidcProvider,
  type CreateOidcProviderPayload,
} from '@/hooks/useOidcProviderAdmin';
import { useToast } from '@/hooks/use-toast';

interface ProviderFormState {
  name: string;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  scopes: string;
  enabled: boolean;
}

const emptyForm: ProviderFormState = {
  name: '',
  issuer_url: '',
  client_id: '',
  client_secret: '',
  scopes: 'openid email profile',
  enabled: true,
};

export default function IdentityProvidersPage() {
  const { providers, isLoading, error, createProvider, updateProvider, deleteProvider } = useOidcProviderAdmin();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<OidcProvider | null>(null);
  const [form, setForm] = useState<ProviderFormState>(emptyForm);
  const [isDeleteOpen, setIsDeleteOpen] = useState<OidcProvider | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (provider: OidcProvider) => {
    setEditing(provider);
    setForm({
      name: provider.name,
      issuer_url: provider.issuer_url,
      client_id: provider.client_id,
      client_secret: '',
      scopes: provider.scopes,
      enabled: provider.enabled,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.issuer_url || !form.client_id) return;
    if (!editing && !form.client_secret) return;

    try {
      if (editing) {
        await updateProvider.mutateAsync({
          providerId: editing.id,
          name: form.name,
          issuer_url: form.issuer_url,
          client_id: form.client_id,
          client_secret: form.client_secret || undefined,
          scopes: form.scopes,
          enabled: form.enabled,
        });
        toast({ title: 'Provider updated', description: `"${form.name}" has been saved` });
      } else {
        const payload: CreateOidcProviderPayload = {
          name: form.name,
          issuer_url: form.issuer_url,
          client_id: form.client_id,
          client_secret: form.client_secret,
          scopes: form.scopes,
          enabled: form.enabled,
        };
        await createProvider.mutateAsync(payload);
        toast({ title: 'Provider created', description: `"${form.name}" is ready for sign-in` });
      }
      setIsFormOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save identity provider' });
    }
  };

  const handleToggleEnabled = async (provider: OidcProvider) => {
    try {
      await updateProvider.mutateAsync({ providerId: provider.id, enabled: !provider.enabled });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update provider' });
    }
  };

  const handleDelete = async (provider: OidcProvider) => {
    try {
      await deleteProvider.mutateAsync(provider.id);
      toast({ title: 'Deleted', description: `"${provider.name}" has been removed` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete provider' });
    } finally {
      setIsDeleteOpen(null);
    }
  };

  const isSaving = createProvider.isPending || updateProvider.isPending;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Identity Providers</h1>
          <p className="page-description">
            Configure external OIDC providers so real people can sign in via SSO
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Identity Provider' : 'Add Identity Provider'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update this provider\'s configuration. Leave the client secret blank to keep it unchanged.'
                  : 'Connect an external OpenID Connect provider (your org\'s SSO, eduGAIN, etc).'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Display Name</Label>
                <Input
                  id="provider-name"
                  placeholder="Acme SSO"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-issuer">Issuer URL</Label>
                <Input
                  id="provider-issuer"
                  placeholder="https://idp.example.org"
                  value={form.issuer_url}
                  onChange={(e) => setForm((f) => ({ ...f, issuer_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Must serve {'{issuer}'}/.well-known/openid-configuration.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-client-id">Client ID</Label>
                <Input
                  id="provider-client-id"
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-client-secret">Client Secret</Label>
                <Input
                  id="provider-client-secret"
                  type="password"
                  placeholder={editing ? 'Leave blank to keep unchanged' : ''}
                  value={form.client_secret}
                  onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-scopes">Scopes</Label>
                <Input
                  id="provider-scopes"
                  value={form.scopes}
                  onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="provider-enabled">Enabled</Label>
                <Switch
                  id="provider-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !form.name || !form.issuer_url || !form.client_id ||
                  (!editing && !form.client_secret) || isSaving
                }
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="data-table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
                </TableCell>
              </TableRow>
            ) : error || !providers || providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Fingerprint className="w-10 h-10 mb-2 opacity-30" />
                    <p>{error ? 'Identity provider management unavailable' : 'No identity providers configured'}</p>
                    <p className="text-sm">
                      {error
                        ? 'You may not have permission to manage identity providers.'
                        : 'Click "Add Provider" to enable SSO login.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-accent" />
                      </div>
                      <p className="font-medium">{provider.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground font-mono">{provider.issuer_url}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground font-mono">{provider.client_id}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(provider)}
                      className={`entity-badge cursor-pointer ${
                        provider.enabled
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Provider actions">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(provider)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setIsDeleteOpen(provider)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
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

      <AlertDialog open={!!isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Identity Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Users who signed in via "{isDeleteOpen?.name}" will no longer be able to log in through it.
              Their accounts are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => isDeleteOpen && handleDelete(isDeleteOpen)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
