import { mockTrustAnchors, mockEntities } from '../data/mockData';
import type { Subordinate } from '../client/models/Subordinate';
import type { SubordinateDetails } from '../client/models/SubordinateDetails';
import type { AuthorityHint } from '../client/models/AuthorityHint';
import type { TrustAnchor, Entity } from '../types/registry';

const STORAGE_KEY_SUBORDINATES = 'mock_subordinates_v3';
const STORAGE_KEY_HINTS = 'mock_hints';
const STORAGE_KEY_CONTEXT = 'mock_context';
const INTERNAL_OWNER_KEY = 'x_mock_owner_id';

interface MockDBState {
  subordinates: SubordinateDetails[];
  authorityHints: AuthorityHint[];
  contextId: string;
}

class MockDB {
  private state: MockDBState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): MockDBState {
    const subs = localStorage.getItem(STORAGE_KEY_SUBORDINATES);
    const hints = localStorage.getItem(STORAGE_KEY_HINTS);
    const ctx = localStorage.getItem(STORAGE_KEY_CONTEXT);

    let subordinates: SubordinateDetails[];
    if (subs) {
      subordinates = JSON.parse(subs);
    } else {
      subordinates = this.initializeFromMocks().subordinates;
    }

    const authorityHints = hints ? JSON.parse(hints) : [];
    const contextId = ctx || 'ta-1'; // Default to "My NREN"

    return { subordinates, authorityHints, contextId };
  }

  private saveState() {
    localStorage.setItem(STORAGE_KEY_SUBORDINATES, JSON.stringify(this.state.subordinates));
    localStorage.setItem(STORAGE_KEY_HINTS, JSON.stringify(this.state.authorityHints));
    localStorage.setItem(STORAGE_KEY_CONTEXT, this.state.contextId);
  }

  private initializeFromMocks(): MockDBState {
    // Map existing TrustAnchors to SubordinateDetails
    const taSubordinates: SubordinateDetails[] = mockTrustAnchors.map((ta: TrustAnchor) => ({
      id: ta.id,
      entity_id: ta.entityId,
      status: ta.status,
      // We assume TAs are federation entities
      registered_entity_types: ['federation_entity'],
      jwks: { keys: [] }, // Mock empty JWKS
      metadata: {
        federation_entity: {
            organization_name: ta.name,
            homepage_uri: ta.entityId,
            logo_uri: 'https://via.placeholder.com/150'
        },
        // Store explicit owner for filtering
        [INTERNAL_OWNER_KEY]: 'root' // TAs are owned by Root
      }
    }));

    // Map existing Entities to SubordinateDetails
    const entitySubordinates: SubordinateDetails[] = mockEntities.map((ent: Entity) => ({
      id: ent.id,
      entity_id: ent.entityId,
      status: ent.status,
      registered_entity_types: ent.entityTypes,
      jwks: { keys: [] },
      metadata: {
        openid_provider: {
            organization_name: ent.organizationName || ent.displayName,
        },
        [INTERNAL_OWNER_KEY]: ent.trustAnchorId || 'ta-1' // Default owner if missing
      }
    }));

    const all = [...taSubordinates, ...entitySubordinates];
    // Default Hints
    const defaultHints: AuthorityHint[] = [
        { id: 'ah-1', entity_id: 'https://edugain.org', description: 'eduGAIN Interfederation' }
    ];
    
    // Default to first TA (ta-1: My NREN Federation)
    return { subordinates: all, authorityHints: defaultHints, contextId: 'ta-1' };
  }

  public getContext(): string {
    return this.state.contextId;
  }

  public setContext(id: string): void {
    this.state.contextId = id;
    this.saveState();
  }

  public getSubordinates(entityType?: string): Subordinate[] {
    // Filter by current context (Owner)
    const context = this.state.contextId;
    
    const visible = this.state.subordinates.filter(sub => {
       const owner = (sub.metadata as any)?.[INTERNAL_OWNER_KEY];
       return owner === context;
    });

    const mapped = visible.map(sub => ({
      id: sub.id,
      entity_id: sub.entity_id,
      status: sub.status,
      registered_entity_types: sub.registered_entity_types,
      description: this.getDescription(sub)
    }));

    if (!entityType) return mapped;
    return mapped.filter(sub => sub.registered_entity_types?.includes(entityType));
  }

  public getSubordinate(id: string): SubordinateDetails | undefined {
    // Allow seeing details if owned, or if strictly needed for UI consistency (though in reality strict access control applies)
    // For demo, we just return if found, but ideally check owner
    return this.state.subordinates.find(s => s.id === id);
  }

  public addSubordinate(sub: SubordinateDetails): void {
    // Tag with current context
    if (!sub.metadata) sub.metadata = {};
    (sub.metadata as any)[INTERNAL_OWNER_KEY] = this.state.contextId;
    
    this.state.subordinates.push(sub);
    this.saveState();
  }


  public updateSubordinate(id: string, updates: Partial<SubordinateDetails>): void {
    const idx = this.state.subordinates.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.state.subordinates[idx] = { ...this.state.subordinates[idx], ...updates };
      this.saveState();
    }
  }

  public deleteSubordinate(id: string): void {
    this.state.subordinates = this.state.subordinates.filter(s => s.id !== id);
    this.saveState();
  }

  public getAuthorityHints(): AuthorityHint[] {
    return this.state.authorityHints;
  }

  public addAuthorityHint(hint: AuthorityHint): void {
    this.state.authorityHints.push(hint);
    this.saveState();
  }

  public deleteAuthorityHint(id: string): void {
    this.state.authorityHints = this.state.authorityHints.filter(h => h.id !== id);
    this.saveState();
  }

  public reset(): void {
    localStorage.removeItem(STORAGE_KEY_SUBORDINATES);
    this.state = this.initializeFromMocks();
  }

  private getDescription(sub: SubordinateDetails): string {
    // Helper to generate a displayable description
    if (sub.metadata?.federation_entity?.organization_name) {
        return sub.metadata.federation_entity.organization_name as string;
    }
    return sub.entity_id;
  }
}

export const mockDB = new MockDB();
