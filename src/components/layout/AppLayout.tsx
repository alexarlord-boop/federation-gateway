import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TrustAnchorSelector } from './TrustAnchorSelector';

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 bg-background">
        {/* Top bar with TA selector */}
        <div className="h-14 border-b border-border flex items-center px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Active Instance:</span>
            <TrustAnchorSelector />
          </div>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
