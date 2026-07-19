/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityID } from './EntityID';
/**
 * Data to create or update a TrustMarkSubject.
 */
export type AddTrustMarkSubject = {
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
     * Per-subject additional claims that override general claims.
     */
    additional_claims?: Record<string, any>;
};

