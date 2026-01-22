import { useState } from 'react';
import { Shield, Plus, ExternalLink, Settings, MoreHorizontal, ChevronUp, Server, Globe, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockTrustAnchors } from '@/data/mockData';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, { label: string; className: string }> = {
  federation: { label: 'Federation', className: 'bg-info/10 text-info border-info/30' },
  intermediate: { label: 'Intermediate', className: 'bg-accent/10 text-accent border-accent/30' },
  test: { label: 'Test', className: 'bg-warning/10 text-warning border-warning/30' },
  training: { label: 'Training', className: 'bg-muted text-muted-foreground border-muted' },
};

// Mock data for hierarchy demonstration
const mockSuperiorAuthorities = [
  {
    id: 'sup-1',
    name: 'eduGAIN Root',
    entityId: 'https://edugain.org',
    type: 'federation',
    status: 'active',
    isExternal: true,
  },
];

const mockSubordinateTAs = [
  {
    id: 'sub-ta-1',
    name: 'National Research Network TA',
    entityId: 'https://nren.example.org',
    type: 'intermediate',
    status: 'active',
    subordinateCount: 15,
  },
  {
    id: 'sub-ta-2',
    name: 'University Consortium IA',
    entityId: 'https://consortium.edu',
    type: 'intermediate',
    status: 'active',
    subordinateCount: 8,
  },
];

function TrustAnchorCard({ 
  ta, 
  isLocal = false, 
  isExternal = false,
  isSubordinate = false 
}: { 
  ta: any; 
  isLocal?: boolean;
  isExternal?: boolean;
  isSubordinate?: boolean;
}) {
  const typeConfig = typeLabels[ta.type];
  const { activeTrustAnchor } = useTrustAnchor();
  const isActive = activeTrustAnchor?.id === ta.id;

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all",
      isActive && "ring-2 ring-accent",
      isExternal && "opacity-75 bg-muted/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors",
              isExternal ? "bg-muted" : "bg-accent/10"
            )}>
              <Shield className={cn("w-6 h-6", isExternal ? "text-muted-foreground" : "text-accent")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{ta.name}</CardTitle>
                {ta.status === 'active' && isLocal && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="In Operation" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`entity-badge border ${typeConfig.className}`}>
                  {typeConfig.label}
                </span>
                {isExternal && (
                  <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">
                    External
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isExternal && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Entity Config
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {ta.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {ta.description}
          </p>
        )}
        
        {!isExternal && ta.subordinateCount !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Subordinates</p>
              <p className="text-2xl font-bold">{ta.subordinateCount}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              ta.status === 'active' 
                ? 'bg-success/10 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {ta.status}
            </div>
          </div>
        )}

        <div className={cn("pt-4 border-t", !isExternal && ta.subordinateCount !== undefined ? "mt-4" : "mt-0")}>
          <p className="text-xs text-muted-foreground truncate font-mono">
            {ta.entityId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddTrustAnchorDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Trust Anchor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Trust Anchor</DialogTitle>
          <DialogDescription>
            Choose how you want to add a new Trust Anchor to the registry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <button 
            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-left group"
            onClick={() => setOpen(false)}
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
              <Server className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-accent transition-colors">Deploy Local Instance</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Spin up a new local signer/registry that you manage. Full CRUD access.
              </p>
            </div>
          </button>
          
          <button 
            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-info hover:bg-info/5 transition-colors text-left group"
            onClick={() => setOpen(false)}
          >
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors shrink-0">
              <Globe className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-info transition-colors">Add Remote Reference</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add an external TA for chain-of-trust display and authority hints. Read-only reference.
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TrustAnchorsPage() {
  // Filter local TAs (ones we manage)
  const localTAs = mockTrustAnchors;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">TAs and IAs</h1>
          <p className="page-description">
            Manage Trust Anchors and Intermediate Authorities
          </p>
        </div>
        <AddTrustAnchorDialog />
      </div>

      {/* Level 1: My Level - Local Instances */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">My Instances</h2>
          <span className="text-sm text-muted-foreground">(Local - Full CRUD)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localTAs.map((ta) => (
            <TrustAnchorCard key={ta.id} ta={ta} isLocal />
          ))}
        </div>
      </section>

      {/* Level 2: Superior Level - Upstream */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ChevronUp className="w-5 h-5 text-info" />
          <h2 className="text-lg font-semibold">Superior Authorities</h2>
          <span className="text-sm text-muted-foreground">(Upstream - Read Only)</span>
        </div>
        {mockSuperiorAuthorities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockSuperiorAuthorities.map((ta) => (
              <TrustAnchorCard key={ta.id} ta={ta} isExternal />
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No superior authorities configured</p>
              <p className="text-sm">Add upstream TAs via authority hints</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Level 3a: Subordinate TAs/Intermediates */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold">Subordinate TAs & Intermediates</h2>
          <span className="text-sm text-muted-foreground">(Downstream - Full CRUD)</span>
        </div>
        {mockSubordinateTAs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockSubordinateTAs.map((ta) => (
              <TrustAnchorCard key={ta.id} ta={ta} isSubordinate />
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No subordinate TAs or Intermediates</p>
              <p className="text-sm">These are managed via subordinate CRUD</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
