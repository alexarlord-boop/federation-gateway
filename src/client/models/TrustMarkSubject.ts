/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdditionalClaims } from './AdditionalClaims';
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
     * Additional custom claims to include for this subject's trust mark.
     */
    additional_claims?: AdditionalClaims;
};

