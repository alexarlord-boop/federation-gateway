/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdditionalClaims } from './AdditionalClaims';
import type { Constraints } from './Constraints';
import type { EntityID } from './EntityID';
import type { InternalID } from './InternalID';
import type { Jwks } from './Jwks';
import type { Metadata } from './Metadata';
import type { MetadataPolicy } from './MetadataPolicy';
/**
 * Subordinate entity including managed data from the subordinate API.
 */
export type SubordinateDetails = {
    /**
     * The internal identifier of the subordinate.
     */
    id: InternalID;
    /**
     * The Entity ID (identifier) of the subordinate.
     */
    entity_id: EntityID;
    /**
     * Current status of the subordinate.
     */
    status: string;
    /**
     * Entity types the subordinate is registered for.
     */
    registered_entity_types?: Array<string>;
    /**
     * The subordinate's JWKS.
     */
    jwks: Jwks;
    /**
     * Subordinate-specific metadata.
     */
    metadata?: Metadata;
    /**
     * Subordinate-specific metadata policies.
     */
    metadata_policies?: MetadataPolicy;
    /**
     * Subordinate-specific constraints.
     */
    constraints?: Constraints;
    /**
     * Subordinate-specific additional custom claims.
     */
    additional_claims?: AdditionalClaims;
};

