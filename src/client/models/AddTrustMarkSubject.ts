/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdditionalClaims } from './AdditionalClaims';
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
     * Additional custom claims to include for this subject's trust mark.
     */
    additional_claims?: AdditionalClaims;
};

