/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { Jwks } from './Jwks';
/**
 * Data to create a new trust mark owner.
 */
export type AddTrustMarkOwnerCreate = {
    /**
     * The Entity ID of the owner.
     */
    entity_id: EntityID;
    /**
     * The JWKS of the owner.
     */
    jwks: Jwks;
};

