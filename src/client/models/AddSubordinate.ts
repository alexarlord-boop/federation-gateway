/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { Jwks } from './Jwks';
/**
 * Data to create a new subordinate entity.
 * Note: Status "active" requires the subordinate to have at least one key in jwks.
 * If no status is provided, defaults to "active" (requires jwks to be provided).
 *
 */
export type AddSubordinate = {
    /**
     * The Entity ID (identifier) of the subordinate.
     */
    entity_id: EntityID;
    /**
     * Initial status of the subordinate. Defaults to "active" if not provided.
     * Note: "active" status requires jwks with at least one key.
     *
     */
    status?: AddSubordinate.status;
    /**
     * Optional human-readable description for this Subordinate.
     */
    description?: string;
    /**
     * Entity types the subordinate is registered for.
     */
    registered_entity_types?: Array<string>;
    /**
     * JWKS for the subordinate. Required if status is "active".
     */
    jwks?: Jwks;
};
export namespace AddSubordinate {
    /**
     * Initial status of the subordinate. Defaults to "active" if not provided.
     * Note: "active" status requires jwks with at least one key.
     *
     */
    export enum status {
        ACTIVE = 'active',
        BLOCKED = 'blocked',
        PENDING = 'pending',
        INACTIVE = 'inactive',
    }
}

