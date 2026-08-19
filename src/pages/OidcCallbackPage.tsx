import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Network } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Lands here after `GET /api/auth/oidc/{provider}/callback` finishes on the
 * backend and redirects the browser back with tokens (or an error) in the
 * URL *fragment* — never a query string, so they're not sent to a server or
 * logged anywhere between the backend and here.
 */
export default function OidcCallbackPage() {
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oidcError = params.get('error');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (oidcError) {
      setError(oidcError);
      return;
    }
    if (!accessToken || !refreshToken) {
      setError('Sign-in did not return valid tokens.');
      return;
    }

    loginWithTokens(accessToken, refreshToken)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setError('Could not complete sign-in.'));
  }, [loginWithTokens, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2">
            <Network className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle>{error ? 'Sign-in failed' : 'Signing you in…'}</CardTitle>
          <CardDescription>
            {error ? error : 'Completing sign-in with your identity provider'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error ? (
            <>
              <AlertCircle className="w-8 h-8 text-destructive" />
              <Button onClick={() => navigate('/login', { replace: true })}>
                Back to sign in
              </Button>
            </>
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
