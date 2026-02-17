/**
 * Backend Info Panel Component
 * 
 * Displays information about the connected backend, including:
 * - Implementation name and version
 * - Enabled/disabled features
 * - RBAC support
 * - Extensions
 */

import { useCapabilities } from '@/contexts/CapabilityContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Info, Server } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function BackendInfoPanel() {
  const { capabilities, isLoading } = useCapabilities();
  const [showDisabled, setShowDisabled] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Backend Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading backend information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!capabilities) {
    return null;
  }

  const enabledFeatures = Object.entries(capabilities.features)
    .filter(([_, feature]) => feature.enabled);
  
  const disabledFeatures = Object.entries(capabilities.features)
    .filter(([_, feature]) => !feature.enabled);

  const formatFeatureName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Backend Information
        </CardTitle>
        <CardDescription>
          Connected to {capabilities.implementation.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Implementation Info */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Implementation</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name:</dt>
              <dd className="font-medium">{capabilities.implementation.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Version:</dt>
              <dd className="font-medium">{capabilities.implementation.version}</dd>
            </div>
            {capabilities.implementation.vendor && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Vendor:</dt>
                <dd className="font-medium">{capabilities.implementation.vendor}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Features</h4>
            <Badge variant="secondary">
              {enabledFeatures.length} of {Object.keys(capabilities.features).length} enabled
            </Badge>
          </div>

          {/* Enabled Features */}
          <div className="space-y-1.5">
            {enabledFeatures.map(([name, feature]) => (
              <div key={name} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{formatFeatureName(name)}</span>
                  {feature.operations && (
                    <span className="text-muted-foreground ml-2">
                      ({feature.operations.length} operations)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Disabled Features (Collapsible) */}
          {disabledFeatures.length > 0 && (
            <Collapsible open={showDisabled} onOpenChange={setShowDisabled} className="mt-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                  <span>Show disabled features ({disabledFeatures.length})</span>
                  <Info className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {disabledFeatures.map(([name, feature]) => (
                  <div key={name} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">{formatFeatureName(name)}</span>
                      {feature.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {feature.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* RBAC Info */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Access Control</h4>
          <div className="flex items-center gap-2 text-sm">
            {capabilities.rbac.supported ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>RBAC Supported</span>
                {capabilities.rbac.roles && (
                  <Badge variant="outline" className="ml-auto">
                    {capabilities.rbac.roles.length} roles
                  </Badge>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">RBAC Not Supported</span>
              </>
            )}
          </div>
        </div>

        {/* Extensions */}
        {capabilities.extensions && Object.keys(capabilities.extensions).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Extensions</h4>
            <div className="space-y-1.5">
              {Object.entries(capabilities.extensions).map(([name, enabled]) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  {enabled ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={enabled ? '' : 'text-muted-foreground'}>
                    {formatFeatureName(name)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
