import { Award, ExternalLink, Info, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkType } from '@/client/models/TrustMarkType';

export default function TrustMarksPage() {
  const { data: trustMarkTypes, isLoading, error } = useQuery<TrustMarkType[]>({
    queryKey: ['trust-mark-types'],
    queryFn: () => FederationTrustMarksService.getTrustMarkTypes(),
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Trust Marks</h1>
          <p className="page-description">
            View trust mark types registered in the federation
          </p>
        </div>
        {/* TODO: Add trust mark type creation when backend supports it */}
      </div>

      <div className="mb-6 p-4 bg-info/10 border border-info/30 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-info mt-0.5" />
        <div>
          <p className="font-medium text-info">Trust Mark Management</p>
          <p className="text-sm text-muted-foreground">
            Trust marks are assigned to entities to indicate compliance with specific policies or capabilities. 
            Trust mark issuance and delegation are managed by the federation operators.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Trust Marks Unavailable</h3>
          <p className="text-muted-foreground text-sm">
            The connected Admin API does not support trust mark management, or the feature is disabled.
          </p>
        </div>
      ) : !trustMarkTypes || trustMarkTypes.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trust Mark Types</h3>
          <p className="text-muted-foreground">
            No trust mark types have been registered yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trustMarkTypes.map((tm) => (
            <Card key={tm.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-mono text-sm break-all">
                      {tm.trust_mark_type}
                    </CardTitle>
                    {tm.description && (
                      <CardDescription className="mt-1">
                        {tm.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Trust Mark ID</p>
                    <p className="text-xs font-mono text-muted-foreground break-all mt-1">
                      {tm.trust_mark_type}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
