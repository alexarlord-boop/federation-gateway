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
  const { trustAnchors } = useTrustAnchors();
  const { setActiveTrustAnchor } = useTrustAnchor();

  useEffect(() => {
    const discovered = trustAnchors
      .filter((ta) => !!ta.adminApiBaseUrl)
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

  // Sync the active backend → TrustAnchorContext so pages that gate on
  // activeTrustAnchor (Settings, Trust Marks) know which instance is live.
  // Also auto-select the first real TA when still on the placeholder default.
  useEffect(() => {
    const matched = trustAnchors.find((ta) => `ta:${ta.id}` === selectedBackend.id);
    if (!matched && taBackends.length > 0) {
      // Switch to first real instance silently (no reload needed — context
      // invalidation in TrustAnchorContext handles refetching).
      setSelectedBackend(taBackends[0].id);
      return;
    }
    setActiveTrustAnchor(matched ?? (trustAnchors.length > 0 ? trustAnchors[0] : null));
  }, [selectedBackend.id, trustAnchors, taBackends, setActiveTrustAnchor, setSelectedBackend]);

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
                <span className="text-sm font-medium truncate w-full text-left">{selectedBackend.name}</span>
                <span className="text-xs select-sublabel truncate w-full text-left">Active Instance</span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[15rem]" align="start">
          <DropdownMenuLabel>Switch Instance</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {taBackends.map((backend) => (
            <DropdownMenuItem
              key={backend.id}
              className="cursor-pointer"
              onClick={() => {
                setSelectedBackend(backend.id);
                window.location.reload();
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
          {taBackends.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">No instances configured</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
