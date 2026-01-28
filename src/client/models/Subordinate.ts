/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { InternalID } from './InternalID';
/**
 * Information about a subordinate entity.
 */
export type Subordinate = {
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
     * Optional human-readable description for this Subordinate.
     */
    description?: string;
    /**
     * Entity types the subordinate is registered for.
     */
    registered_entity_types?: Array<string>;
};

