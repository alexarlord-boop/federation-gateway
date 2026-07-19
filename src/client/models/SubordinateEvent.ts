/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single event in subordinate history.
 */
export type SubordinateEvent = {
    /**
     * Unix timestamp (seconds since epoch) when the event occurred.
     */
    timestamp: number;
    /**
     * The type/category of the event.
     */
    type: SubordinateEvent.type;
    /**
     * Subordinate status at the time of the event, if applicable.
     */
    status?: string | null;
    /**
     * Optional descriptive message providing context for the event.
     */
    message?: string | null;
    /**
     * Optional identifier for the actor performing the event.
     */
    actor?: string | null;
};
export namespace SubordinateEvent {
    /**
     * The type/category of the event.
     */
    export enum type {
        CREATED = 'created',
        DELETED = 'deleted',
        STATUS_UPDATED = 'status_updated',
        UPDATED = 'updated',
        JWK_ADDED = 'jwk_added',
        JWK_REMOVED = 'jwk_removed',
        JWKS_REPLACED = 'jwks_replaced',
        METADATA_UPDATED = 'metadata_updated',
        METADATA_DELETED = 'metadata_deleted',
        POLICY_UPDATED = 'policy_updated',
        POLICY_DELETED = 'policy_deleted',
        CONSTRAINTS_UPDATED = 'constraints_updated',
        CONSTRAINTS_DELETED = 'constraints_deleted',
        CLAIMS_UPDATED = 'claims_updated',
        CLAIM_DELETED = 'claim_deleted',
    }
}

