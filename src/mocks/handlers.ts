import { http, HttpResponse } from 'msw';
import { mockDB } from '../lib/mock-db';

const BASE_URL = 'http://localhost:8765'; // Keeping consistent with OAS server

export const handlers = [
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
];
