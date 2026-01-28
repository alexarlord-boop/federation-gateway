import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowRight, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleOIDCLogin = async () => {
    try {
      // Simulate successful OIDC login as Admin
      await login('admin@oidfed.org', 'admin123');
      navigate('/dashboard');
    } catch (err) {
      setError('OIDC Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-primary-foreground">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Network className="w-7 h-7 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OIDFed Registry</h1>
              <p className="text-primary-foreground/70 text-sm">OpenID Federation Management</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Manage your federation
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Register entities, manage trust anchors, and streamline approval workflows 
              for your OpenID Federation infrastructure.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-primary-foreground/10 rounded-lg">
              <p className="text-2xl font-bold text-primary-foreground">127+</p>
              <p className="text-xs text-primary-foreground/70">Registered Entities</p>
            </div>
            <div className="px-4 py-2 bg-primary-foreground/10 rounded-lg">
              <p className="text-2xl font-bold text-primary-foreground">3</p>
              <p className="text-xs text-primary-foreground/70">Trust Anchors</p>
            </div>
            <div className="px-4 py-2 bg-primary-foreground/10 rounded-lg">
              <p className="text-2xl font-bold text-primary-foreground">45+</p>
              <p className="text-xs text-primary-foreground/70">Organizations</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/50">
          © 2024 OIDFed Registry. Part of the GÉANT federation infrastructure.
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Network className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">OIDFed Registry</h1>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the registry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organization.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  type="button"
                  onClick={handleOIDCLogin}
                  disabled={isLoading}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Sign in with OIDC (eduGAIN)
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Need an account?{' '}
                <a href="#" className="text-accent hover:underline font-medium">
                  Request access
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Admin:</strong> admin@oidfed.org / admin123</p>
              <p><strong>User:</strong> tech@example.org / user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
