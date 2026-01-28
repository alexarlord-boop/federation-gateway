/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { InternalID } from './InternalID';
import type { Jwks } from './Jwks';
/**
 * Data to add or link a trust mark owner.
 */
export type AddTrustMarkOwner = ({
    /**
     * Reference to an existing global owner (internal id).
     */
    owner_id: InternalID;
} | {
    /**
     * The Entity ID of the owner.
     */
    entity_id: EntityID;
    /**
     * The JWKS of the owner.
     */
    jwks: Jwks;
});

