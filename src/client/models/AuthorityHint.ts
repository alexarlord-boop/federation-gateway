/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { InternalID } from './InternalID';
/**
 * The Entity ID of a superior
 */
export type AuthorityHint = {
    /**
     * Internal identifier for this AuthorityHint.
     */
    id: InternalID;
    /**
     * The Entity ID of the superior.
     */
    entity_id: EntityID;
    /**
     * Optional human-readable description for this AuthorityHint.
     */
    description?: string;
};

