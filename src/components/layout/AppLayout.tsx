import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

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
  }, []);

  return (
    <div className="flex min-h-screen">
      <AppSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main className="flex-1 bg-background min-w-0">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
