import { Check, ChevronDown, Shield, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function TrustAnchorSelector() {
  const { activeTrustAnchor, setActiveTrustAnchor, trustAnchors } = useTrustAnchor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-10 px-3 gap-2 bg-background border-border min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-4 h-4 text-accent" />
              {activeTrustAnchor?.status === 'active' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </div>
            <span className="font-medium truncate max-w-[140px]">
              {activeTrustAnchor?.name || 'Select Instance'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Active Trust Anchor
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {trustAnchors.map((ta) => (
          <DropdownMenuItem
            key={ta.id}
            onClick={() => setActiveTrustAnchor(ta)}
            className="flex items-center gap-3 py-2.5 cursor-pointer"
          >
            <div className="relative">
              <Shield className={cn(
                "w-5 h-5",
                ta.type === 'federation' ? 'text-accent' : 
                ta.type === 'intermediate' ? 'text-info' : 
                ta.type === 'test' ? 'text-warning' : 'text-muted-foreground'
              )} />
              {ta.status === 'active' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{ta.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{ta.type}</div>
            </div>
            {activeTrustAnchor?.id === ta.id && (
              <Check className="w-4 h-4 text-accent shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
