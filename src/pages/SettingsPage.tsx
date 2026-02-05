import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthorityHints } from '@/hooks/useAuthorityHints';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { hints, isLoading, addHint, deleteHint } = useAuthorityHints();
  const { toast } = useToast();
  const [newHint, setNewHint] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('ui_theme') || 'theme-default');

  const applyTheme = (value: string) => {
    const root = document.documentElement;
    root.classList.remove('theme-default', 'theme-grayscale', 'theme-indigo');
    root.classList.add(value);
    localStorage.setItem('ui_theme', value);
    setTheme(value);
  };

  const handleAddHint = async () => {
    if (!newHint) return;
    try {
        await addHint.mutateAsync({ entity_id: newHint });
        setNewHint('');
        toast({ title: "Success", description: "Authority hint added" });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add hint" });
    }
  };

  const handleDeleteHint = async (id: string) => {
      try {
          await deleteHint.mutateAsync(id);
          toast({ title: "Deleted", description: "Authority hint removed" });
      } catch(e) {
          toast({ variant: "destructive", title: "Error", description: "Failed to remove hint" });
      }
  };

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose the visual theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={applyTheme}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theme-default">Default (Teal/Navy)</SelectItem>
                  <SelectItem value="theme-grayscale">Grayscale</SelectItem>
                  <SelectItem value="theme-indigo">Indigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        {/* Federation Settings - New Section */}
        <Card>
           <CardHeader>
               <CardTitle>Federation Configuration</CardTitle>
               <CardDescription>Manage authority hints and trust configuration</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              <div>
                  <h3 className="text-sm font-medium mb-2">Authority Hints</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                      List of superiors (intermediaries) this federation operator points to.
                  </p>
                  
                  {isLoading ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                      <div className="space-y-2 mb-4">
                          {hints?.map((hint: any) => (
                              <div key={hint.id} className="flex items-center justify-between p-2 rounded bg-muted">
                                  <span className="text-sm font-mono">{hint.entity_id}</span>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteHint(hint.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                              </div>
                          ))}
                          {hints?.length === 0 && <p className="text-sm text-muted-foreground italic">No authority hints configured.</p>}
                      </div>
                  )}

                  <div className="flex gap-2">
                      <Input 
                        placeholder="https://superior-federation.example.org" 
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                      />
                      <Button onClick={handleAddHint} disabled={!newHint || addHint.isPending}>
                          {addHint.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />}
                          Add
                      </Button>
                  </div>
              </div>
           </CardContent>
        </Card>

        {/* Existing Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} disabled />
              </div>
            </div>
            {user?.organizationName && (
              <div className="space-y-2">
                <Label htmlFor="org">Organization</Label>
                <Input id="org" defaultValue={user.organizationName} disabled />
              </div>
            )}
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
