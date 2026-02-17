import { Server } from 'lucide-react';
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

export function BackendSwitcher() {
  const { backends, selectedBackend, setSelectedBackend } = useBackend();

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
                <span className="text-xs select-sublabel truncate w-full text-left">Active Backend</span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[15rem]" align="start">
          <DropdownMenuLabel>Switch Backend</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {backends.map((backend) => (
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
