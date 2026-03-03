import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_open');
    return saved === null ? true : saved === 'true';
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem('sidebar_open', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen">
      <AppSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main className="flex-1 bg-background min-w-0">
        {/* Sidebar toggle shown in header bar when sidebar is collapsed */}
        {!sidebarOpen && (
          <div className="sticky top-0 z-10 flex items-center px-4 py-3 border-b bg-background/95 backdrop-blur">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Show sidebar <kbd className="ml-1 text-[10px] opacity-60">⌘B</kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
