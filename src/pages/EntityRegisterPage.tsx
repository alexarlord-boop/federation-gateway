import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useCreateSubordinate } from '@/hooks/useSubordinates';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/types/registry';

const steps = [
  { id: 'entity', title: 'Entity ID', description: 'Enter the entity identifier' },
  { id: 'config', title: 'Configuration', description: 'Review fetched configuration' },
  { id: 'details', title: 'Additional Details', description: 'Add extra information' },
  { id: 'review', title: 'Review & Submit', description: 'Confirm registration' },
];

export default function EntityRegisterPage() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    entityId: '',
    trustAnchorId: '',
    displayName: '',
    organizationName: '',
    description: '',
    contactEmail: '',
    contactName: '',
    policyUri: '',
    entityTypes: [] as EntityType[],
  });
  const [fetchedConfig, setFetchedConfig] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Pre-fill entity type if coming from intermediate registration
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'intermediate') {
      setFormData(prev => ({
        ...prev,
        entityTypes: ['federation_entity']
      }));
    }
  }, [searchParams]);
  
  const { trustAnchors } = useTrustAnchors();
  const createSubordinate = useCreateSubordinate();

  const handleFetchConfig = async () => {
    if (!formData.entityId) return;
    
    setIsLoading(true);
    // Simulate fetching entity configuration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock fetched config
    setFetchedConfig({
      iss: formData.entityId,
      sub: formData.entityId,
      metadata: {
        federation_entity: {
          organization_name: 'Detected Organization',
          contacts: ['tech@example.org'],
        },
        openid_provider: {
          issuer: formData.entityId,
          authorization_endpoint: `${formData.entityId}/authorize`,
          token_endpoint: `${formData.entityId}/token`,
        }
      },
      jwks: {
        keys: [{ kty: 'RSA', use: 'sig', kid: 'key-1' }]
      }
    });
    
    setFormData(prev => ({
      ...prev,
      organizationName: 'Detected Organization',
      contactEmail: 'tech@example.org',
      entityTypes: ['openid_provider'],
    }));
    
    setIsLoading(false);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
        await createSubordinate.mutateAsync({
             entity_id: formData.entityId,
             registered_entity_types: formData.entityTypes,
             status: 'draft', // Submitted for review - demonstrates workflow state machine
             metadata: {
                 openid_provider: { 
                     organization_name: formData.organizationName,
                     homepage_uri: formData.entityId 
                 }
             },
             description: formData.displayName // Use description for display name mapping
        } as any);

        toast({
          title: 'Registration Submitted',
          description: 'Your entity registration has been successfully created.',
        });
        
        navigate('/entities');
    } catch (e) {
        toast({
          title: 'Error',
          description: 'Failed to register entity.',
          variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.entityId && formData.trustAnchorId;
      case 1:
        return fetchedConfig !== null;
      case 2:
        return formData.displayName && formData.contactEmail;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="entityId">Entity ID (URL)</Label>
              <Input
                id="entityId"
                type="url"
                placeholder="https://idp.example.org"
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                The entity's identifier URL. Configuration will be fetched from:
              </p>
              {formData.entityId && (
                <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                  {formData.entityId}/.well-known/openid-federation
                </code>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trustAnchor">Trust Anchor</Label>
              <Select 
                value={formData.trustAnchorId} 
                onValueChange={(v) => setFormData({ ...formData, trustAnchorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trust anchor" />
                </SelectTrigger>
                <SelectContent>
                  {trustAnchors.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      <div>
                        <p>{ta.name}</p>
                        <p className="text-xs text-muted-foreground">{ta.type}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleFetchConfig} 
              disabled={!formData.entityId || !formData.trustAnchorId || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching Configuration...
                </>
              ) : (
                <>
                  Fetch Entity Configuration
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-success">Configuration Retrieved</p>
                <p className="text-sm text-muted-foreground">
                  Entity configuration was successfully fetched from the endpoint.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Entity ID</Label>
                <p className="font-mono text-sm mt-1">{fetchedConfig?.iss}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Detected Entity Types</Label>
                <div className="flex gap-2 mt-2">
                  {formData.entityTypes.map((type) => (
                    <span key={type} className="entity-badge bg-info/10 text-info border border-info/30">
                      {type === 'openid_provider' ? 'OpenID Provider' : type}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Organization</Label>
                <p className="mt-1">{fetchedConfig?.metadata?.federation_entity?.organization_name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">JWKS</Label>
                <p className="text-sm mt-1 text-muted-foreground">
                  {fetchedConfig?.jwks?.keys?.length} key(s) found
                </p>
              </div>
            </div>

            <Card className="border-dashed">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(fetchedConfig?.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="p-4 bg-info/10 border border-info/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-info mt-0.5" />
              <div>
                <p className="font-medium text-info">Enrich Entity Information</p>
                <p className="text-sm text-muted-foreground">
                  Add additional details not present in the entity configuration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Friendly name for this entity"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  placeholder="Organization"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this entity..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Technical Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="Contact name"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Technical Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="tech@example.org"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policyUri">Policy URI</Label>
              <Input
                id="policyUri"
                type="url"
                placeholder="https://example.org/policy"
                value={formData.policyUri}
                onChange={(e) => setFormData({ ...formData, policyUri: e.target.value })}
              />
            </div>
          </div>
        );

      case 3:
        const selectedTA = trustAnchors.find(ta => ta.id === formData.trustAnchorId);
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-4">Registration Summary</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entity ID</dt>
                  <dd className="font-mono">{formData.entityId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Display Name</dt>
                  <dd>{formData.displayName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Trust Anchor</dt>
                  <dd>{selectedTA?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd>{formData.organizationName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd>{formData.contactEmail}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entity Types</dt>
                  <dd className="flex gap-1">
                    {formData.entityTypes.map(t => (
                      <span key={t} className="entity-badge bg-info/10 text-info">
                        {t === 'openid_provider' ? 'OP' : t}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="confirm" />
              <Label htmlFor="confirm" className="text-sm font-normal">
                I confirm that the information provided is accurate and I am authorized 
                to register this entity on behalf of my organization.
              </Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <Link 
        to="/entities" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Entities
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Register New Entity</CardTitle>
          <CardDescription>
            Register a new entity in the federation. The entity configuration will be 
            fetched automatically from the entity's well-known endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStep 
                      ? 'bg-success text-success-foreground' 
                      : index === currentStep 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className={`text-xs mt-2 ${
                    index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-success' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Registration
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
