import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Users, 
  ClipboardCheck, 
  Award,
  Settings,
  LogOut,
  ChevronDown,
  Network,
  Leaf
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

import { ContextSwitcher } from './ContextSwitcher';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  children?: { title: string; href: string }[];
}

interface SidebarSection {
  label: string;
  items: NavItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Federation',
    items: [
      { 
        title: 'TAs and IAs', 
        href: '/trust-anchors', 
        icon: Shield,
        adminOnly: true,
      },
      { 
        title: 'Leaf Entities', 
        href: '/entities', 
        icon: Leaf,
        children: [
          { title: 'All Entities', href: '/entities' },
          { title: 'Register New', href: '/entities/register' },
        ]
      },
      { 
        title: 'Trust Marks', 
        href: '/trust-marks', 
        icon: Award,
      },
    ],
  },
  {
    label: 'Organization',
    items: [
      { 
        title: 'Approvals', 
        href: '/approvals', 
        icon: ClipboardCheck,
        adminOnly: true,
      },
      { 
        title: 'Users', 
        href: '/users', 
        icon: Users,
        adminOnly: true,
      },
    ],
  },
];

export function AppSidebar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(['Leaf Entities']);

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.title);
    
    // For items with children, check if any child path matches
    const isActive = hasChildren
      ? item.children?.some(child => location.pathname === child.href) || location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + '/');

    if (hasChildren) {
      return (
        <Collapsible 
          key={item.href} 
          open={isOpen}
          onOpenChange={() => toggleSection(item.title)}
        >
          <CollapsibleTrigger className="w-full">
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-sidebar-accent text-sidebar-primary" 
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}>
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  end
                  className={({ isActive }) => cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "text-sidebar-primary font-medium" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  )}
                >
                  {child.title}
                </NavLink>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive 
            ? "bg-sidebar-accent text-sidebar-primary" 
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="w-5 h-5" />
        <span>{item.title}</span>
      </NavLink>
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Network className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">OIDFed</h1>
            <p className="text-xs text-sidebar-foreground/60">Registry</p>
          </div>
        </div>
      </div>

      <div className="pt-4 px-2">
        <ContextSwitcher />
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 px-2 py-1.5 bg-warning/10 border border-warning/30 rounded-md text-xs text-warning flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            Mock API Mode
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {sidebarSections.map((section) => {
          const filteredItems = section.items.filter(item => !item.adminOnly || isAdmin);
          if (filteredItems.length === 0) return null;
          
          return (
            <div key={section.label}>
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.label}
                </span>
              </div>
              <div className="space-y-1">
                {filteredItems.map(renderNavItem)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.role === 'admin' ? 'FedOps Admin' : 'Technical Contact'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <NavLink
            to="/settings"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
          <button
            onClick={logout}
            className="flex items-center justify-center px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
