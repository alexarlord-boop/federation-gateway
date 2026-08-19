import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Users,
  ClipboardCheck,
  Award,
  Settings,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Network,
  ScanSearch,
  BarChart3,
  ScrollText,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCapabilities } from '@/contexts/CapabilityContext';
import { CapabilityGuard } from '@/components/CapabilityGuard';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { BackendSwitcher } from './BackendSwitcher';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  feature?: string; // Feature required for this nav item
  children?: { title: string; href: string; feature?: string; operation?: string }[];
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
        title: 'Instances',
        href: '/trust-anchors',
        icon: Shield,
        adminOnly: true,
        feature: 'trust_anchors',
      },
      {
        title: 'Subordinates',
        href: '/entities',
        icon: Network,
        feature: 'subordinates',
        children: [
          { title: 'All Subordinates', href: '/entities', feature: 'subordinates', operation: 'list' },
          { title: 'Register Subordinate', href: '/entities/register', feature: 'subordinates', operation: 'create' },
        ]
      },
      {
        title: 'Trust Marks',
        href: '/trust-marks',
        icon: Award,
        feature: 'federation_trust_marks',
      },
      {
        title: 'Chain Inspector',
        href: '/chain-inspector',
        icon: ScanSearch,
      },
      {
        title: 'Stats',
        href: '/stats',
        icon: BarChart3,
      },
      {
        title: 'Audit Log',
        href: '/audit-log',
        icon: ScrollText,
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
        feature: 'subordinates', // Approvals require subordinate management
      },
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        adminOnly: true,
      },
      {
        title: 'RBAC Management',
        href: '/rbac',
        icon: Shield,
        adminOnly: true,
      },
      {
        title: 'Identity Providers',
        href: '/identity-providers',
        icon: Fingerprint,
        adminOnly: true,
      },
    ],
  },
];

interface AppSidebarProps {
  open?: boolean;
  onToggle?: () => void;
}

export function AppSidebar({ open = true, onToggle }: AppSidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const { isFeatureEnabled, hasOperation } = useCapabilities();
  const location = useLocation();
  const navigate = useNavigate();
  // Sections with children start collapsed so every item keeps the same
  // per-row height at rest — an auto-expanded section grows open-mode nav
  // taller than the icon rail (which never shows children inline), which
  // knocks every item below it out of vertical alignment between states.
  const [openSections, setOpenSections] = useState<string[]>([]);

  const isCurrentNavTarget = (href: string) => {
    const [pathname, search = ''] = href.split('?');
    // Keep pathname + query matching exact so /entities/register and /entities/register?type=intermediate
    // can highlight different sidebar entries.
    return location.pathname === pathname && location.search === (search ? `?${search}` : '');
  };

  const toggleSection = (title: string) => {
    setOpenSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Check admin-only permission (feature gating is handled by CapabilityGuard)
  const shouldShowNavItem = (item: NavItem): boolean => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  };

  // Check if child nav item should be shown (feature gating handled by CapabilityGuard)
  const shouldShowChildItem = (child: { feature?: string; operation?: string }): boolean => {
    // CapabilityGuard wraps the parent; children still do operation-level checks
    if (!child.feature) return true;
    if (child.operation) return hasOperation(child.feature, child.operation);
    return isFeatureEnabled(child.feature);
  };

  const renderCollapsedNavItem = (item: NavItem) => {
    if (!shouldShowNavItem(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const visibleChildren = hasChildren
      ? item.children?.filter(shouldShowChildItem) || []
      : [];

    if (hasChildren && visibleChildren.length === 0) return null;

    const isActive = hasChildren
      ? visibleChildren?.some((child) => isCurrentNavTarget(child.href)) || isCurrentNavTarget(item.href)
      : isCurrentNavTarget(item.href) || location.pathname.startsWith(item.href + '/');

    // A fixed left margin (not mx-auto) keeps the icon's x-position constant
    // while the sidebar's width is mid-transition — centering via mx-auto
    // recomputes every animation frame against the *current* (animating)
    // width, which made icons visibly drift sideways during collapse/expand.
    const iconButtonClass = cn(
      "flex items-center justify-center w-10 h-10 ml-1 rounded-lg transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-primary"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );

    if (hasChildren && visibleChildren.length > 0) {
      return (
        <DropdownMenu key={item.href}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={iconButtonClass} title={item.title} aria-label={item.title}>
              <item.icon className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleChildren.map((child) => (
              <DropdownMenuItem key={child.href} onClick={() => navigate(child.href)}>
                {child.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <NavLink to={item.href} className={iconButtonClass} aria-label={item.title}>
            <item.icon className="w-5 h-5" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  };

  const renderNavItem = (item: NavItem) => {
    // Check if this item should be shown
    if (!shouldShowNavItem(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.title);

    // Filter children based on feature availability
    const visibleChildren = hasChildren
      ? item.children?.filter(shouldShowChildItem) || []
      : [];

    // Don't show parent if it has children but none are visible
    if (hasChildren && visibleChildren.length === 0) return null;

    // For items with children, check if any child path matches
    const isActive = hasChildren
      ? visibleChildren?.some((child) => isCurrentNavTarget(child.href)) || isCurrentNavTarget(item.href)
      : isCurrentNavTarget(item.href) || location.pathname.startsWith(item.href + '/');

    if (hasChildren && visibleChildren.length > 0) {
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
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{item.title}</span>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform shrink-0",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-8 mt-1 space-y-1">
              {visibleChildren.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  end
                  className={() => cn(
                    "block px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                    isCurrentNavTarget(child.href)
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
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap">{item.title}</span>
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden',
        open ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo — fixed height and position so nothing below it shifts when toggling */}
      <div className="h-16 shrink-0 border-b border-sidebar-border flex items-center px-3 gap-3">
        <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Network className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-sidebar-foreground whitespace-nowrap">OIDFed</h1>
            <p className="text-xs text-sidebar-foreground/60 whitespace-nowrap">Registry</p>
          </div>
        )}
      </div>

      <BackendSwitcher collapsed={!open} />

      {/* Navigation */}
      {/* Horizontal padding is constant across states (only vertical differs) —
          changing it with `open` would itself snap-shift every icon's x-position
          the instant the sidebar starts (or finishes) animating. */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {sidebarSections.map((section, index) => {
          const filteredItems = section.items.filter(shouldShowNavItem);
          if (filteredItems.length === 0) return null;

          const renderItem = open ? renderNavItem : renderCollapsedNavItem;

          return (
            <div key={section.label}>
              {index > 0 && (
                <div className={cn("border-t border-sidebar-foreground/15", open ? "mx-3 my-3" : "mx-2 my-3")} />
              )}
              <div className="space-y-1">
                {filteredItems.map((item) =>
                  item.feature ? (
                    <CapabilityGuard key={item.href} capability={item.feature}>
                      {renderItem(item)}
                    </CapabilityGuard>
                  ) : (
                    renderItem(item)
                  )
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn("border-t border-sidebar-border", open ? "p-4" : "py-4")}>
        {open ? (
          <>
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
                <Settings className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Settings</span>
              </NavLink>
              <button
                onClick={logout}
                aria-label="Log out"
                className="flex items-center justify-center px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  aria-label="Settings"
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  aria-label="Log out"
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Collapse toggle — always the last element, full width, consistent in both states */}
      {open ? (
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 flex items-center gap-3 px-3 py-2.5 mx-2 mb-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <ChevronsLeft className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">Collapse</span>
          <kbd className="ml-auto text-[10px] opacity-60 shrink-0">⌘B</kbd>
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Expand sidebar"
              className="shrink-0 flex items-center justify-center w-10 h-10 ml-3 mb-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Expand sidebar <kbd className="ml-1 text-[10px] opacity-60">⌘B</kbd>
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
}
