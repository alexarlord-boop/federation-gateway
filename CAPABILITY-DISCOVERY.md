# Capability Discovery & Dynamic Feature Management

## Problem Statement

The OpenAPI specification is comprehensive and extensive by design - it covers all possible OIDFed management features. However:

1. **Different backend implementations may support different subsets** of the API
2. **Organizations may choose to disable certain features** for policy reasons
3. **RBAC should only manage permissions for features that actually exist** in the deployed backend
4. **UI should dynamically show/hide features** based on backend capabilities

## Solution: Capability Discovery Endpoint

### Core Concept

The backend self-reports what it supports via a **capability manifest**. The UI:
- Fetches capabilities on startup
- Dynamically enables/disables features
- Auto-generates RBAC permission lists from available capabilities
- Provides admin UI for permission management

---

## OpenAPI Specification Addition

### New Endpoint: `GET /api/v1/capabilities`

Add to `Federation Admin OpenAPI.yaml`:

```yaml
/api/v1/capabilities:
  get:
    tags:
      - System
    summary: Get backend capabilities
    description: >
      Returns a manifest of features and endpoints supported by this backend implementation.
      UI uses this to enable/disable features and generate RBAC permissions.
    operationId: getCapabilities
    responses:
      '200':
        description: Backend capability manifest
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CapabilityManifest'
            example:
              version: "1.0.0"
              implementation:
                name: "FastAPI Reference Implementation"
                version: "0.2.0"
                vendor: "NREN-Example"
              features:
                subordinates:
                  enabled: true
                  operations:
                    - list
                    - create
                    - read
                    - update
                    - delete
                    - approve
                  endpoints:
                    - GET /api/v1/admin/subordinates
                    - POST /api/v1/admin/subordinates
                    - GET /api/v1/admin/subordinates/{id}
                    - PATCH /api/v1/admin/subordinates/{id}
                    - DELETE /api/v1/admin/subordinates/{id}
                    - POST /api/v1/admin/subordinates/{id}/approve
                trust_anchors:
                  enabled: true
                  operations:
                    - list
                    - create
                    - read
                    - update
                  endpoints:
                    - GET /api/v1/admin/trust-anchors
                    - POST /api/v1/admin/trust-anchors
                    - GET /api/v1/admin/trust-anchors/{id}
                    - PATCH /api/v1/admin/trust-anchors/{id}
                trust_marks:
                  enabled: true
                  operations:
                    - list
                    - create
                    - read
                    - revoke
                  endpoints:
                    - GET /api/v1/admin/trust-marks
                    - POST /api/v1/admin/trust-marks
                    - GET /api/v1/admin/trust-marks/{id}
                    - POST /api/v1/admin/trust-marks/{id}/revoke
                authority_hints:
                  enabled: false
                  reason: "Not implemented in this version"
                jwks_management:
                  enabled: true
                  operations:
                    - list_keys
                    - add_key
                    - rotate_key
                    - delete_key
                  endpoints:
                    - GET /api/v1/admin/entity-configuration/keys
                    - POST /api/v1/admin/entity-configuration/keys
                    - POST /api/v1/admin/entity-configuration/keys/{kid}/rotate
                    - DELETE /api/v1/admin/entity-configuration/keys/{kid}
                entity_statements:
                  enabled: true
                  operations:
                    - generate
                    - sign
                    - validate
                  endpoints:
                    - POST /api/v1/admin/subordinates/{id}/statement
                    - POST /api/v1/admin/statements/validate
                federation_discovery:
                  enabled: false
                  reason: "Planned for v0.3.0"
              rbac:
                supported: true
                roles:
                  - id: "super_admin"
                    name: "Super Administrator"
                    description: "Full system access"
                  - id: "fed_operator"
                    name: "Federation Operator"
                    description: "Manage subordinates and trust anchors"
                  - id: "tech_contact"
                    name: "Technical Contact"
                    description: "View entities and manage keys"
                  - id: "viewer"
                    name: "Viewer"
                    description: "Read-only access"
                permissions_model: "feature-based"
              extensions:
                custom_metadata_fields: true
                webhook_notifications: false
                audit_logging: true
```

### Schema Definition

```yaml
components:
  schemas:
    CapabilityManifest:
      type: object
      required:
        - version
        - implementation
        - features
        - rbac
      properties:
        version:
          type: string
          description: Capability manifest schema version
          example: "1.0.0"
        implementation:
          type: object
          required:
            - name
            - version
          properties:
            name:
              type: string
              description: Backend implementation name
            version:
              type: string
              description: Backend version
            vendor:
              type: string
              description: Organization providing this implementation
        features:
          type: object
          description: Feature availability map
          additionalProperties:
            $ref: '#/components/schemas/FeatureCapability'
        rbac:
          type: object
          required:
            - supported
          properties:
            supported:
              type: boolean
              description: Whether RBAC is supported
            roles:
              type: array
              description: Available roles
              items:
                $ref: '#/components/schemas/RoleDefinition'
            permissions_model:
              type: string
              enum:
                - feature-based
                - endpoint-based
                - custom
        extensions:
          type: object
          description: Optional/custom features
          additionalProperties:
            type: boolean
    
    FeatureCapability:
      type: object
      required:
        - enabled
      properties:
        enabled:
          type: boolean
          description: Whether this feature is available
        operations:
          type: array
          description: Supported operations for this feature
          items:
            type: string
            enum:
              - list
              - create
              - read
              - update
              - delete
              - approve
              - reject
              - revoke
              - sign
              - validate
              - rotate
        endpoints:
          type: array
          description: API endpoints implementing this feature
          items:
            type: string
        reason:
          type: string
          description: Explanation if feature is disabled
    
    RoleDefinition:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          description: Unique role identifier
        name:
          type: string
          description: Human-readable role name
        description:
          type: string
          description: Role purpose and scope
        builtin:
          type: boolean
          description: Whether this is a system role (cannot be deleted)
          default: false
```

---

## UI Implementation

### 1. Capability Service

```typescript
// src/services/capabilities.ts

export interface CapabilityManifest {
  version: string;
  implementation: {
    name: string;
    version: string;
    vendor?: string;
  };
  features: Record<string, FeatureCapability>;
  rbac: {
    supported: boolean;
    roles?: RoleDefinition[];
    permissions_model?: 'feature-based' | 'endpoint-based' | 'custom';
  };
  extensions?: Record<string, boolean>;
}

export interface FeatureCapability {
  enabled: boolean;
  operations?: string[];
  endpoints?: string[];
  reason?: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  builtin?: boolean;
}

class CapabilityService {
  private manifest: CapabilityManifest | null = null;
  
  async fetchCapabilities(): Promise<CapabilityManifest> {
    const response = await fetch('/api/v1/capabilities');
    this.manifest = await response.json();
    return this.manifest;
  }
  
  isFeatureEnabled(featureName: string): boolean {
    return this.manifest?.features[featureName]?.enabled ?? false;
  }
  
  hasOperation(featureName: string, operation: string): boolean {
    const feature = this.manifest?.features[featureName];
    if (!feature?.enabled) return false;
    return feature.operations?.includes(operation) ?? false;
  }
  
  getEnabledFeatures(): string[] {
    if (!this.manifest) return [];
    return Object.entries(this.manifest.features)
      .filter(([_, capability]) => capability.enabled)
      .map(([name, _]) => name);
  }
  
  getAvailableRoles(): RoleDefinition[] {
    return this.manifest?.rbac.roles ?? [];
  }
  
  supportsRBAC(): boolean {
    return this.manifest?.rbac.supported ?? false;
  }
}

export const capabilityService = new CapabilityService();
```

### 2. Capability Context

```typescript
// src/contexts/CapabilityContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { CapabilityManifest, capabilityService } from '@/services/capabilities';

interface CapabilityContextType {
  capabilities: CapabilityManifest | null;
  isLoading: boolean;
  isFeatureEnabled: (feature: string) => boolean;
  hasOperation: (feature: string, operation: string) => boolean;
  getEnabledFeatures: () => string[];
}

const CapabilityContext = createContext<CapabilityContextType | undefined>(undefined);

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const [capabilities, setCapabilities] = useState<CapabilityManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    capabilityService.fetchCapabilities()
      .then(setCapabilities)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);
  
  const value: CapabilityContextType = {
    capabilities,
    isLoading,
    isFeatureEnabled: capabilityService.isFeatureEnabled.bind(capabilityService),
    hasOperation: capabilityService.hasOperation.bind(capabilityService),
    getEnabledFeatures: capabilityService.getEnabledFeatures.bind(capabilityService),
  };
  
  return (
    <CapabilityContext.Provider value={value}>
      {children}
    </CapabilityContext.Provider>
  );
}

export function useCapabilities() {
  const context = useContext(CapabilityContext);
  if (!context) {
    throw new Error('useCapabilities must be used within CapabilityProvider');
  }
  return context;
}
```

### 3. Dynamic Navigation

```typescript
// src/components/layout/AppSidebar.tsx

import { useCapabilities } from '@/contexts/CapabilityContext';

export function AppSidebar() {
  const { isFeatureEnabled } = useCapabilities();
  
  return (
    <nav>
      <NavLink to="/dashboard">Dashboard</NavLink>
      
      {isFeatureEnabled('subordinates') && (
        <NavLink to="/entities">Entities</NavLink>
      )}
      
      {isFeatureEnabled('trust_anchors') && (
        <NavLink to="/trust-anchors">Trust Anchors</NavLink>
      )}
      
      {isFeatureEnabled('trust_marks') && (
        <NavLink to="/trust-marks">Trust Marks</NavLink>
      )}
      
      {isFeatureEnabled('authority_hints') && (
        <NavLink to="/authority-hints">Authority Hints</NavLink>
      )}
      
      {isFeatureEnabled('jwks_management') && (
        <NavLink to="/keys">Key Management</NavLink>
      )}
    </nav>
  );
}
```

### 4. Conditional Actions

```typescript
// src/pages/EntitiesPage.tsx

import { useCapabilities } from '@/contexts/CapabilityContext';

export function EntitiesPage() {
  const { hasOperation } = useCapabilities();
  
  return (
    <div>
      <h1>Entities</h1>
      
      {hasOperation('subordinates', 'create') && (
        <Button onClick={handleCreate}>Register New Entity</Button>
      )}
      
      <EntityTable>
        {entities.map(entity => (
          <EntityRow key={entity.id} entity={entity}>
            {hasOperation('subordinates', 'update') && (
              <Button onClick={() => handleEdit(entity)}>Edit</Button>
            )}
            {hasOperation('subordinates', 'delete') && (
              <Button onClick={() => handleDelete(entity)}>Delete</Button>
            )}
            {hasOperation('subordinates', 'approve') && entity.status === 'pending' && (
              <Button onClick={() => handleApprove(entity)}>Approve</Button>
            )}
          </EntityRow>
        ))}
      </EntityTable>
    </div>
  );
}
```

### 5. Dynamic RBAC Permission UI

```typescript
// src/pages/RBACManagementPage.tsx

import { useCapabilities } from '@/contexts/CapabilityContext';

export function RBACManagementPage() {
  const { capabilities, getEnabledFeatures } = useCapabilities();
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  if (!capabilities?.rbac.supported) {
    return <div>RBAC not supported by this backend</div>;
  }
  
  // Auto-generate permission tree from enabled features
  const permissionTree = getEnabledFeatures().map(featureName => {
    const feature = capabilities.features[featureName];
    return {
      feature: featureName,
      displayName: featureName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      operations: feature.operations || [],
      endpoints: feature.endpoints || []
    };
  });
  
  return (
    <div>
      <h1>Role & Permission Management</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Role List */}
        <div>
          <h2>Roles</h2>
          {capabilities.rbac.roles?.map(role => (
            <RoleCard 
              key={role.id} 
              role={role} 
              onClick={() => setSelectedRole(role.id)}
            />
          ))}
        </div>
        
        {/* Dynamic Permission Assignment */}
        <div>
          <h2>Permissions for {selectedRole || 'Select a role'}</h2>
          {selectedRole && permissionTree.map(({ feature, displayName, operations }) => (
            <div key={feature} className="border p-4 mb-2">
              <h3>{displayName}</h3>
              <div className="space-y-1">
                {operations.map(operation => (
                  <label key={operation} className="flex items-center">
                    <input 
                      type="checkbox" 
                      name={`${feature}.${operation}`}
                      // Controlled by role permissions
                    />
                    <span className="ml-2">{operation}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 6. Backend Info Panel

```typescript
// src/components/BackendInfoPanel.tsx

import { useCapabilities } from '@/contexts/CapabilityContext';

export function BackendInfoPanel() {
  const { capabilities } = useCapabilities();
  
  if (!capabilities) return null;
  
  const enabledCount = Object.values(capabilities.features)
    .filter(f => f.enabled).length;
  const totalCount = Object.keys(capabilities.features).length;
  
  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <h3 className="font-semibold mb-2">Backend Information</h3>
      <dl className="space-y-1 text-sm">
        <div>
          <dt className="font-medium">Implementation:</dt>
          <dd>{capabilities.implementation.name} v{capabilities.implementation.version}</dd>
        </div>
        {capabilities.implementation.vendor && (
          <div>
            <dt className="font-medium">Vendor:</dt>
            <dd>{capabilities.implementation.vendor}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium">Features Enabled:</dt>
          <dd>{enabledCount} of {totalCount}</dd>
        </div>
        <div>
          <dt className="font-medium">RBAC Support:</dt>
          <dd>{capabilities.rbac.supported ? '✓ Yes' : '✗ No'}</dd>
        </div>
      </dl>
      
      <details className="mt-2">
        <summary className="cursor-pointer text-sm">View disabled features</summary>
        <ul className="mt-2 space-y-1 text-xs">
          {Object.entries(capabilities.features)
            .filter(([_, cap]) => !cap.enabled)
            .map(([name, cap]) => (
              <li key={name}>
                <strong>{name}:</strong> {cap.reason || 'Not available'}
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
```

---

## Backend Implementation

### FastAPI Reference Implementation

```python
# backend/app/routers/capabilities.py

from fastapi import APIRouter
from typing import Dict, List, Optional
from pydantic import BaseModel

router = APIRouter()

class FeatureCapability(BaseModel):
    enabled: bool
    operations: Optional[List[str]] = None
    endpoints: Optional[List[str]] = None
    reason: Optional[str] = None

class RoleDefinition(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    builtin: bool = False

class RBACInfo(BaseModel):
    supported: bool
    roles: Optional[List[RoleDefinition]] = None
    permissions_model: Optional[str] = None

class ImplementationInfo(BaseModel):
    name: str
    version: str
    vendor: Optional[str] = None

class CapabilityManifest(BaseModel):
    version: str
    implementation: ImplementationInfo
    features: Dict[str, FeatureCapability]
    rbac: RBACInfo
    extensions: Optional[Dict[str, bool]] = None

@router.get("/api/v1/capabilities", response_model=CapabilityManifest)
async def get_capabilities():
    """
    Return backend capability manifest.
    
    This endpoint is called by the UI on startup to discover
    which features are available in this backend implementation.
    """
    return CapabilityManifest(
        version="1.0.0",
        implementation=ImplementationInfo(
            name="FastAPI Reference Implementation",
            version="0.2.0",
            vendor="NREN-Example"
        ),
        features={
            "subordinates": FeatureCapability(
                enabled=True,
                operations=["list", "create", "read", "update", "delete", "approve"],
                endpoints=[
                    "GET /api/v1/admin/subordinates",
                    "POST /api/v1/admin/subordinates",
                    "GET /api/v1/admin/subordinates/{id}",
                    "PATCH /api/v1/admin/subordinates/{id}",
                    "DELETE /api/v1/admin/subordinates/{id}",
                    "POST /api/v1/admin/subordinates/{id}/approve"
                ]
            ),
            "trust_anchors": FeatureCapability(
                enabled=True,
                operations=["list", "create", "read", "update"],
                endpoints=[
                    "GET /api/v1/admin/trust-anchors",
                    "POST /api/v1/admin/trust-anchors",
                    "GET /api/v1/admin/trust-anchors/{id}",
                    "PATCH /api/v1/admin/trust-anchors/{id}"
                ]
            ),
            "trust_marks": FeatureCapability(
                enabled=True,
                operations=["list", "create", "read", "revoke"],
                endpoints=[
                    "GET /api/v1/admin/trust-marks",
                    "POST /api/v1/admin/trust-marks",
                    "GET /api/v1/admin/trust-marks/{id}",
                    "POST /api/v1/admin/trust-marks/{id}/revoke"
                ]
            ),
            "authority_hints": FeatureCapability(
                enabled=False,
                reason="Planned for v0.3.0"
            ),
            "jwks_management": FeatureCapability(
                enabled=True,
                operations=["list_keys", "add_key", "rotate_key", "delete_key"],
                endpoints=[
                    "GET /api/v1/admin/entity-configuration/keys",
                    "POST /api/v1/admin/entity-configuration/keys",
                    "POST /api/v1/admin/entity-configuration/keys/{kid}/rotate",
                    "DELETE /api/v1/admin/entity-configuration/keys/{kid}"
                ]
            ),
            "federation_discovery": FeatureCapability(
                enabled=False,
                reason="Not implemented in this version"
            )
        },
        rbac=RBACInfo(
            supported=True,
            roles=[
                RoleDefinition(
                    id="super_admin",
                    name="Super Administrator",
                    description="Full system access",
                    builtin=True
                ),
                RoleDefinition(
                    id="fed_operator",
                    name="Federation Operator",
                    description="Manage subordinates and trust anchors",
                    builtin=True
                ),
                RoleDefinition(
                    id="tech_contact",
                    name="Technical Contact",
                    description="View entities and manage keys",
                    builtin=True
                ),
                RoleDefinition(
                    id="viewer",
                    name="Viewer",
                    description="Read-only access",
                    builtin=True
                )
            ],
            permissions_model="feature-based"
        ),
        extensions={
            "custom_metadata_fields": True,
            "webhook_notifications": False,
            "audit_logging": True
        }
    )
```

### Register the Router

```python
# backend/app/main.py

from app.routers import capabilities

app.include_router(capabilities.router, tags=["System"])
```

---

## Benefits

### 1. **No OAS Specification Trimming Required**
- Keep all endpoints documented
- Backends implement what they can
- UI adapts automatically

### 2. **Flexible Backend Implementations**
- Minimal implementation can expose just core features
- Advanced implementations can enable all features
- Gradual feature rollout supported

### 3. **Automatic RBAC Management**
- Admin UI generates permission lists from available features
- No hardcoded permission enums
- Role assignment UI adapts to backend capabilities

### 4. **Better UX**
- No broken links to unimplemented features
- Clear indication of what's available
- Backend version/vendor information visible

### 5. **Developer-Friendly**
- Backend implementers document capabilities in code
- UI developers don't need backend knowledge
- Feature flags handled automatically

---

## Migration Strategy

### Week 1 Tasks (Updated)

#### Day 1-2: Add Capability Discovery to OpenAPI Spec
- Add `/api/v1/capabilities` endpoint definition
- Add schema definitions for manifest
- Document expected behavior

#### Day 3: Implement in Reference Backend
- Create `capabilities.py` router
- Define current feature set
- Test endpoint manually

#### Day 4: Implement UI Capability Service
- Create capability context
- Fetch on app startup
- Add loading state

#### Day 5: Update Navigation & Features
- Make navigation dynamic
- Add feature guards to components
- Add backend info panel to dashboard

### Week 2: RBAC UI (New Priority)

#### Day 1-2: Create RBAC Management Page
- Auto-generate permission tree
- Role assignment UI
- Permission matrix view

#### Day 3-4: Integrate with Backend
- API endpoints for role/permission management
- Update user model with roles
- Permission checking middleware

#### Day 5: Testing & Documentation
- Test with different capability configurations
- Document for backend implementers

---

## Configuration Examples

### Minimal Backend (Just Viewing)

```json
{
  "features": {
    "subordinates": {
      "enabled": true,
      "operations": ["list", "read"]
    },
    "trust_anchors": {
      "enabled": true,
      "operations": ["list", "read"]
    }
  }
}
```

**Result**: UI shows entities and trust anchors, but no create/edit/delete buttons.

### Full Featured Backend

```json
{
  "features": {
    "subordinates": {
      "enabled": true,
      "operations": ["list", "create", "read", "update", "delete", "approve", "reject"]
    },
    "trust_marks": {
      "enabled": true,
      "operations": ["list", "create", "read", "update", "revoke"]
    },
    "jwks_management": {
      "enabled": true,
      "operations": ["list_keys", "add_key", "rotate_key", "delete_key"]
    }
  }
}
```

**Result**: UI shows all features, full management capabilities.

### Progressive Rollout

```json
{
  "features": {
    "trust_marks": {
      "enabled": false,
      "reason": "Coming in Q2 2026"
    }
  }
}
```

**Result**: Trust marks section hidden, with explanation in backend info panel.

---

## Testing Strategy

### UI Tests
```typescript
// Test that UI adapts to different capability configurations
describe('Capability-driven UI', () => {
  it('hides create button when create operation not available', () => {
    mockCapabilities({ subordinates: { enabled: true, operations: ['list', 'read'] } });
    render(<EntitiesPage />);
    expect(screen.queryByText('Register New Entity')).not.toBeInTheDocument();
  });
  
  it('shows full CRUD when all operations available', () => {
    mockCapabilities({ 
      subordinates: { 
        enabled: true, 
        operations: ['list', 'create', 'read', 'update', 'delete'] 
      } 
    });
    render(<EntitiesPage />);
    expect(screen.getByText('Register New Entity')).toBeInTheDocument();
  });
});
```

### Backend Compliance Tests
```bash
# Validate that backend returns valid capability manifest
npm run test:capabilities -- --url https://backend.example.org
```

---

## Summary

This approach:
- ✅ **Keeps the full OAS spec** - nothing deleted
- ✅ **Backends self-describe** capabilities
- ✅ **UI auto-adapts** to available features
- ✅ **RBAC auto-generates** from capabilities
- ✅ **Progressive enhancement** - add features over time
- ✅ **Clear to operators** - see what backend supports

**Next Step**: Should I start implementing the capability discovery endpoint and UI integration?
