/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
import type { InternalID } from './InternalID';
/**
 * Subject eligible for a specific trust mark issuance.
 */
export type TrustMarkSubject = {
    /**
     * Internal identifier for this TrustMarkSubject.
     */
    readonly id: InternalID;
    /**
     * The Entity ID (identifier) of the subject.
     */
    entity_id: EntityID;
    /**
     * Current status of the subject.
     */
    status: string;
    /**
     * Optional human-readable description for this TrustMarkSubject.
     */
    description?: string;
    /**
     * Per-subject additional claims (simple key-value map) that override general claims.
     * Example: {"level": "premium"} would override a general {"level": "standard"}
     *
     */
    additional_claims?: Record<string, any>;
};

