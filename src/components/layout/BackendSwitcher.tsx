import { Server } from 'lucide-react';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useBackend } from '@/contexts/BackendContext';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { GATEWAY_BASE } from '@/lib/api-config';

export function BackendSwitcher() {
  const { backends, selectedBackend, setSelectedBackend, registerBackends } = useBackend();
  const { trustAnchors, isLoading } = useTrustAnchors();
  const { activeTrustAnchor, setActiveTrustAnchor, setTrustAnchors } = useTrustAnchor();

  useEffect(() => {
    setTrustAnchors(trustAnchors);
  }, [setTrustAnchors, trustAnchors]);

  useEffect(() => {
    const discovered = trustAnchors
      .filter((ta) => ta.deploymentManaged && !!ta.adminApiBaseUrl)
      .map((ta) => ({
        id: `ta:${ta.id}`,
        name: ta.name,
        // Always use the gateway's own origin as the baseUrl so that the auth
        // token scope key (derived from selectedBackend.baseUrl) never changes
        // when switching instances.  Proxied calls to the Admin API go through
        // GATEWAY_BASE/api/v1/proxy/{id} regardless of adminApiBaseUrl.
        baseUrl: GATEWAY_BASE,
      }));

    if (discovered.length > 0) {
      registerBackends(discovered);
    }
  }, [registerBackends, trustAnchors]);

  // Only real (TA-backed) backends are shown and selectable.
  const taBackends = backends.filter((b) => b.id.startsWith('ta:'));

  const selectedLabel = activeTrustAnchor?.name ?? 'Select instance';

  return (
    <div className="px-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-start h-11 px-3 border-dashed">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-medium truncate w-full text-left">{selectedLabel}</span>
                <span className="text-xs select-sublabel truncate w-full text-left">Active Instance</span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[15rem]" align="start">
          <DropdownMenuLabel>Switch Instance</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {taBackends.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">No instances configured</span>
            </DropdownMenuItem>
          )}
          {taBackends.map((backend) => (
            <DropdownMenuItem
              key={backend.id}
              className="cursor-pointer"
              onClick={() => {
                setSelectedBackend(backend.id);
                const match = trustAnchors.find((ta) => `ta:${ta.id}` === backend.id) ?? null;
                setActiveTrustAnchor(match);
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{backend.name}</span>
                <span className="text-xs text-muted-foreground">{backend.baseUrl || '/ (same-origin proxy)'}</span>
              </div>
              {backend.id === selectedBackend.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
