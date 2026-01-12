import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  ExternalLink, 
  Copy, 
  Mail, 
  Key,
  FileText,
  Clock,
  User,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTypeBadge } from '@/components/ui/entity-type-badge';
import { mockEntities } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const entity = mockEntities.find(e => e.id === id);

  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Entity Not Found</h2>
        <p className="text-muted-foreground mb-4">The entity you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/entities">Back to Entities</Link>
        </Button>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/entities" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Entities
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">
                  {entity.displayName || entity.entityId}
                </h1>
                <StatusBadge status={entity.status} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-mono">{entity.entityId}</span>
                <button 
                  onClick={() => copyToClipboard(entity.entityId, 'Entity ID')}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {entity.entityTypes.map((type) => (
                  <EntityTypeBadge key={type} type={type} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`${entity.entityId}/.well-known/openid-federation`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Config
              </a>
            </Button>
            <Button asChild>
              <Link to={`/entities/${entity.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="jwks">JWKS</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Entity Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organization</p>
                    <p className="mt-1">{entity.organizationName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trust Anchor</p>
                    <p className="mt-1">{entity.trustAnchorName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="mt-1">{new Date(entity.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="mt-1">{new Date(entity.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {entity.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="mt-1">{entity.description}</p>
                  </div>
                )}

                {entity.policyUri && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Policy URI</p>
                    <a 
                      href={entity.policyUri} 
                      target="_blank" 
                      rel="noopener"
                      className="mt-1 text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {entity.policyUri}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {entity.contacts && entity.contacts.length > 0 ? (
                  <div className="space-y-4">
                    {entity.contacts.map((contact, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{contact.name || 'Contact'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{contact.type}</p>
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-sm text-accent hover:underline flex items-center gap-1 mt-1"
                          >
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contacts configured</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workflow status */}
          {(entity.status === 'pending' || entity.submittedBy) && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        by {entity.submittedBy}
                      </p>
                    </div>
                  </div>
                  <div className="h-0.5 w-16 bg-border" />
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entity.status === 'pending' 
                        ? 'bg-pending/10' 
                        : entity.status === 'approved' || entity.status === 'active'
                        ? 'bg-success/10'
                        : 'bg-destructive/10'
                    }`}>
                      <Clock className={`w-5 h-5 ${
                        entity.status === 'pending'
                          ? 'text-pending'
                          : entity.status === 'approved' || entity.status === 'active'
                          ? 'text-success'
                          : 'text-destructive'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {entity.status === 'pending' ? 'Pending Review' : 
                         entity.status === 'approved' || entity.status === 'active' ? 'Approved' : 
                         'Rejected'}
                      </p>
                      {entity.approvedBy && (
                        <p className="text-sm text-muted-foreground">
                          by {entity.approvedBy} on {new Date(entity.approvedAt!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Entity Metadata</CardTitle>
              <CardDescription>
                Metadata retrieved from the entity configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{JSON.stringify({
  federation_entity: {
    organization_name: entity.organizationName,
    contacts: entity.contacts?.map(c => c.email),
    logo_uri: entity.logoUri,
    policy_uri: entity.policyUri,
  },
  ...(entity.entityTypes.includes('openid_provider') && {
    openid_provider: {
      issuer: entity.entityId,
      authorization_endpoint: `${entity.entityId}/authorize`,
      token_endpoint: `${entity.entityId}/token`,
      response_types_supported: ['code', 'id_token'],
    }
  }),
  ...(entity.entityTypes.includes('openid_relying_party') && {
    openid_relying_party: {
      redirect_uris: [`${entity.entityId}/callback`],
      response_types: ['code'],
      grant_types: ['authorization_code'],
    }
  }),
}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jwks">
          <Card>
            <CardHeader>
              <CardTitle>JSON Web Key Set</CardTitle>
              <CardDescription>
                Public keys used for signing and encryption
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Key className="w-5 h-5 text-accent" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Signing Key</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      kid: example-key-1 • RS256
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{JSON.stringify({
  keys: [
    {
      kty: "RSA",
      use: "sig",
      kid: "example-key-1",
      alg: "RS256",
      n: "0vx7agoebGcQSuuPiLJXZpt...",
      e: "AQAB"
    }
  ]
}, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                Timeline of changes to this entity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Entity updated', by: 'System', date: entity.updatedAt },
                  { action: 'Entity created', by: entity.submittedBy || 'Admin', date: entity.createdAt },
                ].map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <div>
                      <p className="font-medium text-sm">{event.action}</p>
                      <p className="text-xs text-muted-foreground">
                        by {event.by} • {new Date(event.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
