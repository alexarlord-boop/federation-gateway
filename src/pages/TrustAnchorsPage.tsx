import { Link } from 'react-router-dom';
import { Shield, Plus, ExternalLink, Settings, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockTrustAnchors } from '@/data/mockData';

const typeLabels: Record<string, { label: string; className: string }> = {
  federation: { label: 'Federation', className: 'bg-info/10 text-info border-info/30' },
  intermediate: { label: 'Intermediate', className: 'bg-accent/10 text-accent border-accent/30' },
  test: { label: 'Test', className: 'bg-warning/10 text-warning border-warning/30' },
  training: { label: 'Training', className: 'bg-muted text-muted-foreground border-muted' },
};

export default function TrustAnchorsPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Trust Anchors</h1>
          <p className="page-description">
            Manage federation trust anchors and intermediate authorities
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Trust Anchor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTrustAnchors.map((ta) => {
          const typeConfig = typeLabels[ta.type];
          return (
            <Card key={ta.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{ta.name}</CardTitle>
                      <span className={`entity-badge mt-1 border ${typeConfig.className}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
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
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {ta.description}
                </p>
                
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

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {ta.entityId}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
