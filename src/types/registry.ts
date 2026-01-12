export type UserRole = 'admin' | 'user';

export type EntityStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

export type EntityType = 'openid_provider' | 'openid_relying_party' | 'federation_entity' | 'oauth_authorization_server' | 'oauth_client' | 'oauth_resource';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  createdAt: string;
}

export interface TrustAnchor {
  id: string;
  name: string;
  entityId: string;
  description?: string;
  type: 'federation' | 'intermediate' | 'test' | 'training';
  status: 'active' | 'inactive';
  subordinateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Entity {
  id: string;
  entityId: string;
  displayName?: string;
  entityTypes: EntityType[];
  trustAnchorId: string;
  trustAnchorName: string;
  status: EntityStatus;
  organizationName?: string;
  contacts?: Contact[];
  logoUri?: string;
  policyUri?: string;
  description?: string;
  jwks?: JWKS;
  metadata?: EntityMetadata;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Contact {
  type: 'technical' | 'administrative' | 'support';
  name?: string;
  email: string;
  phone?: string;
}

export interface JWKS {
  keys: JWK[];
}

export interface JWK {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

export interface EntityMetadata {
  federation_entity?: FederationEntityMetadata;
  openid_provider?: OpenIDProviderMetadata;
  openid_relying_party?: OpenIDRelyingPartyMetadata;
}

export interface FederationEntityMetadata {
  organization_name?: string;
  contacts?: string[];
  logo_uri?: string;
  policy_uri?: string;
  homepage_uri?: string;
}

export interface OpenIDProviderMetadata {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  response_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
}

export interface OpenIDRelyingPartyMetadata {
  redirect_uris?: string[];
  response_types?: string[];
  grant_types?: string[];
  application_type?: string;
  client_name?: string;
  logo_uri?: string;
}

export interface TrustMark {
  id: string;
  trustMarkId: string;
  name: string;
  description?: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface ApprovalRequest {
  id: string;
  entityId: string;
  entityDisplayName: string;
  type: 'registration' | 'update' | 'deletion';
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface DashboardStats {
  totalEntities: number;
  activeEntities: number;
  pendingApprovals: number;
  trustAnchors: number;
  opCount: number;
  rpCount: number;
  recentRegistrations: number;
}
