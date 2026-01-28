/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { Jwks } from './Jwks';
/**
 * Data to add/register a subordinate entity.
 */
export type AddSubordinate = {
    /**
     * The Entity ID (identifier) of the subordinate.
     */
    entity_id: EntityID;
    /**
     * Entity types the subordinate is registered for.
     */
    registered_entity_types?: Array<string>;
    /**
     * The subordinate's JWKS.
     */
    jwks?: Jwks;
};

