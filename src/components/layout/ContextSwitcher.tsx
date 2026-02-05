import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Network, Crown, Building, FlaskConical, Shield, GraduationCap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';

const getIconForType = (type: string) => {
  switch (type) {
    case 'federation': return Building;
    case 'test': return FlaskConical;
    case 'training': return GraduationCap;
    default: return Shield;
  }
};

export function ContextSwitcher() {
  const queryClient = useQueryClient();
    const { trustAnchors, isLoading } = useTrustAnchors();
  
  // Fetch current context
  const { data: currentCtxData } = useQuery({
    queryKey: ['debug-context'],
    queryFn: async () => {
        const res = await fetch('http://localhost:8765/api/debug/context');
        return res.json();
    }
  });

  const switchContext = useMutation({
      mutationFn: async (id: string) => {
          await fetch('http://localhost:8765/api/debug/context', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contextId: id })
          });
      },
      onSuccess: () => {
          queryClient.invalidateQueries();
          window.location.reload(); // Hard reload to ensure all stores clear
      }
  });

    const availableContexts = trustAnchors.map(ta => ({
            id: ta.id,
            name: ta.name,
            icon: getIconForType(ta.type),
            description: ta.description || 'Federation Instance'
    }));

    const activeContext = availableContexts.find(c => c.id === currentCtxData?.contextId) || availableContexts[0];
    const Icon = activeContext?.icon || Shield;

  return (
    <div className="px-3 pb-3">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-12 px-3 border-dashed" disabled={isLoading || availableContexts.length === 0}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                             <span className="text-sm font-medium truncate w-full block text-left">{activeContext?.name || 'No Instance'}</span>
                             <span className="text-xs select-sublabel truncate w-full block text-left">Active Instance</span>
                        </div>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[15rem]" align="start">
                <DropdownMenuLabel>Switch Instance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableContexts.length === 0 && (
                    <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                        No instances available
                    </DropdownMenuItem>
                )}
                {availableContexts.map(ctx => {
                    const ItemIcon = ctx.icon;
                    return (
                        <DropdownMenuItem 
                            key={ctx.id} 
                            onClick={() => switchContext.mutate(ctx.id)}
                            className="group gap-2 p-2 cursor-pointer"
                        >
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                <ItemIcon className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{ctx.name}</span>
                                                                <span className="text-xs select-sublabel group-data-[highlighted]:select-sublabel-active">
                                                                    {ctx.description}
                                                                </span>
                            </div>
                            {ctx.id === activeContext?.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
