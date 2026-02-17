import { http, HttpResponse } from 'msw';
import { mockDB } from '../lib/mock-db';

const BASE_URL = 'http://localhost:8765'; // Keeping consistent with OAS server

export const handlers = [
  // Capability Discovery
  http.get(`${BASE_URL}/api/v1/capabilities`, () => {
    return HttpResponse.json({
      version: "1.0.0",
      implementation: {
        name: "MSW Mock Backend",
        version: "0.2.0",
        vendor: "Development Environment"
      },
      features: {
        subordinates: {
          enabled: true,
          operations: [
            "list",
            "create",
            "read",
            "update",
            "delete",
            "approve"
          ],
          endpoints: [
            "GET /api/v1/admin/subordinates",
            "POST /api/v1/admin/subordinates",
            "GET /api/v1/admin/subordinates/{id}",
            "PATCH /api/v1/admin/subordinates/{id}",
            "DELETE /api/v1/admin/subordinates/{id}",
            "POST /api/v1/admin/subordinates/{id}/approve"
          ]
        },
        trust_anchors: {
          enabled: true,
          operations: [
            "list",
            "create",
            "read",
            "update"
          ],
          endpoints: [
            "GET /api/v1/admin/trust-anchors",
            "POST /api/v1/admin/trust-anchors"
          ]
        },
        trust_marks: {
          enabled: true,
          operations: [
            "list",
            "create",
            "read",
            "revoke"
          ],
          endpoints: [
            "GET /api/v1/admin/trust-marks"
          ]
        },
        jwks_management: {
          enabled: true,
          operations: [
            "list_keys",
            "add_key",
            "delete_key"
          ],
          endpoints: [
            "GET /api/v1/admin/entity-configuration/keys",
            "POST /api/v1/admin/entity-configuration/keys"
          ]
        },
        authority_hints: {
          enabled: false,
          reason: "Not implemented in MSW mock"
        },
        federation_discovery: {
          enabled: false,
          reason: "Planned for future release"
        }
      },
      rbac: {
        supported: true,
        roles: [
          {
            id: "super_admin",
            name: "Super Administrator",
            description: "Full system access",
            builtin: true
          },
          {
            id: "fed_operator",
            name: "Federation Operator",
            description: "Manage subordinates and trust anchors",
            builtin: true
          },
          {
            id: "tech_contact",
            name: "Technical Contact",
            description: "View entities and manage keys",
            builtin: true
          },
          {
            id: "viewer",
            name: "Viewer",
            description: "Read-only access",
            builtin: true
          }
        ],
        permissions_model: "feature-based"
      },
      extensions: {
        custom_metadata_fields: true,
        webhook_notifications: false,
        audit_logging: false,
        bulk_operations: false
      }
    });
  }),

  // List Subordinates
  http.get(`${BASE_URL}/api/v1/admin/subordinates`, ({ request }) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entity_type');
    
    const subordinates = mockDB.getSubordinates(entityType || undefined);
    return HttpResponse.json(subordinates);
  }),

  // Get Subordinate Details
  http.get(`${BASE_URL}/api/v1/admin/subordinates/:id`, ({ params }) => {
    const { id } = params;
    const sub = mockDB.getSubordinate(id as string);
    
    if (!sub) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(sub);
  }),

  // Delete Subordinate
  http.delete(`${BASE_URL}/api/v1/admin/subordinates/:id`, ({ params }) => {
    const { id } = params;
    mockDB.deleteSubordinate(id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // Update Subordinate Status
  http.put(`${BASE_URL}/api/v1/admin/subordinates/:id/status`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as { status: string };
    
    const sub = mockDB.getSubordinate(id as string);
    if (!sub) return new HttpResponse(null, { status: 404 });

    mockDB.updateSubordinate(id as string, { status: body.status });
    
    // Return updated subordinate (simplified, usually returns full object)
    const updated = mockDB.getSubordinate(id as string);
    return HttpResponse.json(updated);
  }),

  // Update Subordinate Metadata (Full replacement)
  http.put(`${BASE_URL}/api/v1/admin/subordinates/:id/metadata`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    
    const sub = mockDB.getSubordinate(id as string);
    if (!sub) return new HttpResponse(null, { status: 404 });

    mockDB.updateSubordinate(id as string, { metadata: body });
    return HttpResponse.json(body);
  }),

  // Add JWK
  http.post(`${BASE_URL}/api/v1/admin/subordinates/:id/jwks`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    
    const sub = mockDB.getSubordinate(id as string);
    if (!sub) return new HttpResponse(null, { status: 404 });

    const currentKeys = sub.jwks?.keys || [];
    const newKeys = [...currentKeys, body];
    
    mockDB.updateSubordinate(id as string, { 
        jwks: { ...sub.jwks, keys: newKeys } 
    });
    
    return HttpResponse.json({ keys: newKeys });
  }),

  // Set JWKS
  http.put(`${BASE_URL}/api/v1/admin/subordinates/:id/jwks`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    
    const sub = mockDB.getSubordinate(id as string);
    if (!sub) return new HttpResponse(null, { status: 404 });

    mockDB.updateSubordinate(id as string, { jwks: body });
    return HttpResponse.json(body);
  }),

    // Create Subordinate (Mock implementation - simplified)
  http.post(`${BASE_URL}/api/v1/admin/subordinates`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Very simple unique ID generation
    const newId = `sub-${Date.now()}`;
    
    const newSub = {
        id: newId,
        entity_id: body.entity_id || `https://new-entity-${newId}.org`,
        status: 'active',
        registered_entity_types: body.registered_entity_types || [],
        jwks: body.jwks || { keys: [] },
        metadata: body.metadata || {}
    };

    mockDB.addSubordinate(newSub);
    
    return HttpResponse.json({
        id: newId,
        ...newSub
    }, { status: 201 });
  }),

  // List Authority Hints
  http.get(`${BASE_URL}/api/v1/admin/entity-configuration/authority-hints`, () => {
    return HttpResponse.json(mockDB.getAuthorityHints());
  }),

  // Add Authority Hint
  http.post(`${BASE_URL}/api/v1/admin/entity-configuration/authority-hints`, async ({ request }) => {
    const body = await request.json() as { entity_id: string };
    
    const newHint = {
        id: `ah-${Date.now()}`,
        entity_id: body.entity_id,
    };

    mockDB.addAuthorityHint(newHint);
    
    return HttpResponse.json(newHint, { status: 201 });
  }),

  // Delete Authority Hint
  http.delete(`${BASE_URL}/api/v1/admin/entity-configuration/authority-hints/:id`, ({ params }) => {
    mockDB.deleteAuthorityHint(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Context Switching (Debug/Demo API) ---
  http.get(`${BASE_URL}/api/debug/context`, () => {
      return HttpResponse.json({ contextId: mockDB.getContext() });
  }),

  http.post(`${BASE_URL}/api/debug/context`, async ({ request }) => {
      const body = await request.json() as { contextId: string };
      mockDB.setContext(body.contextId);
      return HttpResponse.json({ contextId: body.contextId });
  }),
];
