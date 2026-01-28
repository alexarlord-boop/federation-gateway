/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { Jwks } from './Jwks';
/**
 * Owner of a trust mark type.
 */
export type TrustMarkOwner = {
    /**
     * The Entity ID of the owner.
     */
    entity_id: EntityID;
    /**
     * The JWKS of the owner.
     */
    jwks: Jwks;
    /**
     * Optional human-readable description for this TrustMarkOwner.
     */
    description?: string;
};

