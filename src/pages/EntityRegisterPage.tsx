import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, ExternalLink, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as SelectPrimitive from '@radix-ui/react-select';
import { 
  Select, 
  SelectContent, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EntityTypeMultiSelect } from '@/components/entities/EntityTypeMultiSelect';
import {
  type EntityType,
  ENTITY_TYPE_LABELS,
  ALL_ENTITY_TYPES,
} from '@/components/ui/entity-type-badge';
import { useTrustAnchors } from '@/hooks/useTrustAnchors';
import { useCreateSubordinate, useDeleteSubordinate, useSubordinates } from '@/hooks/useSubordinates';
import { useToast } from '@/hooks/use-toast';
import { gatewayFetch } from '@/lib/gateway-fetch';
import { SubordinateMetadataService } from '@/client/services/SubordinateMetadataService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

const steps = [
  { id: 'entity', title: 'Subordinate ID', description: 'Enter the subordinate identifier' },
  { id: 'config', title: 'Configuration', description: 'Review fetched configuration' },
  { id: 'details', title: 'Additional Details', description: 'Add extra information' },
  { id: 'review', title: 'Review & Submit', description: 'Confirm registration' },
];

export default function EntityRegisterPage() {
  const { activeTrustAnchor } = useTrustAnchor();
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Per OIDF spec §5.1.1: Intermediate MUST publish federation_fetch_endpoint;
  // Leaf MUST NOT. Derive this from the fetched config, not from entity type selection.
  // (A Trust Mark Issuer can also have federation_entity without being an Intermediate.)
  const isIntermediate = !!(fetchedConfig?.metadata?.federation_entity?.federation_fetch_endpoint);
  const pageTitle = isIntermediate ? 'Register Intermediate' : 'Register Subordinate';
  const pageDescription = isIntermediate
    ? 'Register an intermediate in the federation. The full configuration will be fetched from the well-known endpoint.'
    : 'Register a new subordinate in the federation. The configuration will be fetched from the well-known endpoint.';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trustAnchors } = useTrustAnchors();
  const createSubordinate = useCreateSubordinate();
  const deleteSubordinate = useDeleteSubordinate();
  const { data: existingSubordinates = [] } = useSubordinates();
  const isDuplicateEntityId = !!formData.entityId &&
    existingSubordinates.some((s) => s.entity_id === formData.entityId);

  if (!activeTrustAnchor) {
    return (
      <div className="text-center py-12">
        <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select an Instance</h3>
        <p className="text-muted-foreground">Choose a federation instance from the sidebar to register subordinates.</p>
      </div>
    );
  }

  const handleFetchConfig = async () => {
    if (!formData.entityId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await gatewayFetch<{ payload: Record<string, unknown>; raw_jwt: string }>({
        path: `/api/v1/admin/resolve?entity_id=${encodeURIComponent(formData.entityId)}`,
        softFail: [404, 422, 502, 503, 504],
      });
      if (result === null) {
        const msg = 'Could not fetch subordinate configuration — enter details manually in the next step.';
        setFetchError(msg);
        setFetchedConfig({ iss: formData.entityId, metadata: null, _fetchFailed: true });
      } else {
        const payload = result.payload as any;
        const fedEntity = payload.metadata?.federation_entity ?? {};
        const contacts: unknown[] = fedEntity.contacts ?? [];
        const firstContact = contacts[0];
        const firstEmail =
          typeof firstContact === 'string'
            ? firstContact
            : typeof firstContact === 'object' && firstContact !== null
              ? (firstContact as any).email ?? ''
              : '';
        const firstContactName =
          typeof firstContact === 'object' && firstContact !== null
            ? (firstContact as any).name ?? ''
            : '';
        const detectedTypes = ALL_ENTITY_TYPES.filter(
          (t) => t in (payload.metadata ?? {}),
        );
        // Prefer federation_entity fields; fall back to the first detected entity-type metadata
        const firstEntityMeta: any = detectedTypes.length > 0
          ? (payload.metadata?.[detectedTypes[0]] ?? {})
          : {};
        const resolvedDisplayName =
          fedEntity.display_name ?? fedEntity.organization_name ??
          firstEntityMeta.client_name ?? firstEntityMeta.display_name ?? '';
        const resolvedOrgName =
          fedEntity.organization_name ?? fedEntity.display_name ?? '';
        const resolvedDescription = fedEntity.description ?? '';
        const resolvedPolicyUri = fedEntity.policy_uri ?? '';
        setFetchedConfig(payload);
        setFormData((prev) => ({
          ...prev,
          displayName: resolvedDisplayName || prev.displayName,
          organizationName: resolvedOrgName || prev.organizationName,
          description: resolvedDescription || prev.description,
          contactEmail: firstEmail || prev.contactEmail,
          contactName: firstContactName || prev.contactName,
          policyUri: resolvedPolicyUri || prev.policyUri,
          entityTypes: detectedTypes.length > 0 ? detectedTypes : prev.entityTypes,
        }));
      }
    } catch {
      const msg = 'Failed to reach the subordinate endpoint — enter details manually in the next step.';
      setFetchError(msg);
      setFetchedConfig({ iss: formData.entityId, metadata: null, _fetchFailed: true });
    } finally {
      setIsLoading(false);
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    let createdId: number | string | null = null;
    try {
        const newEntity = await createSubordinate.mutateAsync({
             entity_id: formData.entityId,
             registered_entity_types: formData.entityTypes,
             status: 'pending',
             jwks: fetchedConfig?.jwks ?? undefined,
             ...(formData.displayName && { description: formData.displayName }),
        });
        createdId = newEntity.id;

        // Build and submit metadata per entity type. Roll back on failure.
        const contacts: Array<string | { name?: string; email?: string }> = [];
        if (formData.contactEmail) {
          contacts.push(
            formData.contactName
              ? { name: formData.contactName, email: formData.contactEmail }
              : formData.contactEmail
          );
        }

        const metadataByType: Record<string, Record<string, unknown>> = {
          federation_entity: {
            ...(formData.organizationName && { organization_name: formData.organizationName }),
            homepage_uri: formData.entityId,
            ...(formData.policyUri && { policy_uri: formData.policyUri }),
            ...(contacts.length > 0 && { contacts }),
            entity_role: isIntermediate ? 'intermediate' : 'leaf',
          },
        };

        if (!isIntermediate) {
          if (formData.entityTypes.includes('openid_provider')) {
            metadataByType.openid_provider = {
              issuer: formData.entityId,
              ...(formData.displayName && { client_name: formData.displayName }),
              ...(formData.policyUri && { policy_uri: formData.policyUri }),
              ...(contacts.length > 0 && { contacts }),
            };
          }
          if (formData.entityTypes.includes('openid_relying_party')) {
            metadataByType.openid_relying_party = {
              ...(formData.displayName && { client_name: formData.displayName }),
              ...(formData.policyUri && { policy_uri: formData.policyUri }),
              ...(contacts.length > 0 && { contacts }),
            };
          }
          // oauth_authorization_server, oauth_client, and oauth_resource do not have
          // a separate typed-metadata block here. Their registration is recorded via
          // registered_entity_types; detailed per-type claims can be enriched later
          // through the entity-detail metadata editor once the spec requirements for
          // these roles are finalized.
        }

        for (const [entityType, claims] of Object.entries(metadataByType)) {
          await SubordinateMetadataService.changeSubordinateEntityTypedMetadata(
            createdId as number,
            entityType,
            claims,
          );
        }

        toast({
          title: 'Registration Submitted',
          description: 'Subordinate registered and metadata saved successfully.',
        });
        navigate('/entities');
    } catch (e) {
        // Roll back: delete the subordinate if it was created before the failure
        if (createdId !== null) {
          try {
            await deleteSubordinate.mutateAsync(String(createdId));
          } catch {
            // Rollback failed — log but don't mask the original error
            console.error('Rollback failed for subordinate', createdId);
          }
        }
        const errBody = (e as any)?.body;
        const errMsg: string = errBody?.detail ?? errBody?.error ?? '';
        const isNilPointer = errMsg.includes('nil pointer') || errMsg.includes('runtime error');
        toast({
          title: 'Registration Failed',
          description: isNilPointer
            ? 'This entity ID was previously registered and soft-deleted in this instance. To re-register it, an administrator must restore or purge the old record.'
            : 'Could not complete registration. Please try again.',
          variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!(formData.entityId && formData.trustAnchorId);
      case 1:
        return fetchedConfig !== null && formData.entityTypes.length > 0 && !isDuplicateEntityId;
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
              <Label htmlFor="entityId">Subordinate ID (URL)</Label>
              <Input
                id="entityId"
                type="url"
                placeholder="https://idp.example.org"
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                The subordinate's identifier URL. Configuration will be fetched from:
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
                <SelectTrigger id="trustAnchor">
                  <SelectValue placeholder="Select a trust anchor" />
                </SelectTrigger>
                <SelectContent>
                  {trustAnchors.map((ta) => (
                    <SelectPrimitive.Item
                      key={ta.id}
                      value={ta.id}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground group"
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <SelectPrimitive.ItemText>{ta.name}</SelectPrimitive.ItemText>
                      <span className="text-xs select-sublabel ml-2 group-data-[highlighted]:select-sublabel-active">
                        {ta.type}
                      </span>
                    </SelectPrimitive.Item>
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
                  Fetch Subordinate Configuration
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {fetchedConfig?._fetchFailed ? (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Configuration Not Available</p>
                  <p className="text-sm text-muted-foreground">
                    {fetchError ?? 'Could not fetch subordinate configuration.'} Review and complete the fields in the next step.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
                <Check className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-success">Configuration Retrieved</p>
                  <p className="text-sm text-muted-foreground">
                    Subordinate configuration was successfully fetched from the endpoint.
                  </p>
                </div>
              </div>
            )}

            {isDuplicateEntityId && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Already Registered</p>
                  <p className="text-sm text-muted-foreground">
                    A subordinate with this entity ID is already registered in this instance. You cannot register the same entity ID twice.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Subordinate ID</Label>
                <p className="font-mono text-sm mt-1">{fetchedConfig?.iss}</p>
              </div>

              <div data-testid="entity-type-display" className="space-y-2">
                  <Label className="text-muted-foreground">Subordinate Type</Label>
                  <EntityTypeMultiSelect
                    selected={formData.entityTypes}
                    onChange={(types) => setFormData({ ...formData, entityTypes: types })}
                  />
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
                <p className="font-medium text-info">Enrich Subordinate Information</p>
                <p className="text-sm text-muted-foreground">
                  Add additional details not present in the subordinate configuration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Friendly name for this subordinate"
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
                placeholder="Brief description of this subordinate..."
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
                  <dt className="text-muted-foreground">Subordinate ID</dt>
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
                    <dt className="text-muted-foreground">Subordinate Type</dt>
                    <dd className="flex flex-wrap gap-1 justify-end">
                      {formData.entityTypes.map(t => (
                        <span key={t} className="entity-badge bg-info/10 text-info border border-info/30">
                          {ENTITY_TYPE_LABELS[t]}
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
                to register this subordinate on behalf of my organization.
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
        Back to Subordinates
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
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
