import { Award, ExternalLink, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockTrustMarkTypes = [
  {
    id: 'tm-1',
    name: 'REFEDS MFA Profile',
    description: 'Indicates support for REFEDS Multi-Factor Authentication profile',
    issuer: 'https://refeds.org',
    entityCount: 45,
  },
  {
    id: 'tm-2',
    name: 'eduGAIN Member',
    description: 'Entity is a registered eduGAIN member',
    issuer: 'https://edugain.org',
    entityCount: 120,
  },
  {
    id: 'tm-3',
    name: 'SIRTFI Certified',
    description: 'Security Incident Response Trust Framework for Federated Identity',
    issuer: 'https://refeds.org',
    entityCount: 38,
  },
  {
    id: 'tm-4',
    name: 'Research & Scholarship',
    description: 'Entity supports R&S attribute bundle',
    issuer: 'https://refeds.org',
    entityCount: 89,
  },
];

export default function TrustMarksPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Trust Marks</h1>
        <p className="page-description">
          View trust mark types registered in the federation
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockTrustMarkTypes.map((tm) => (
          <Card key={tm.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{tm.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {tm.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Issuer</p>
                  <a 
                    href={tm.issuer} 
                    target="_blank" 
                    rel="noopener" 
                    className="text-sm text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {tm.issuer}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{tm.entityCount}</p>
                  <p className="text-xs text-muted-foreground">entities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
