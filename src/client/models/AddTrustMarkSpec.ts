/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdditionalClaims } from './AdditionalClaims';
/**
 * Data to create or update a TrustMarkSpec.
 */
export type AddTrustMarkSpec = {
    /**
     * The trust mark type identifier.
     */
    trust_mark_type: string;
    /**
     * Lifetime of the trust mark, in seconds.
     */
    lifetime?: number;
    /**
     * URL reference with details about the trust mark type.
     */
    ref?: string;
    /**
     * URL to the logo associated with this trust mark type.
     */
    logo_uri?: string;
    /**
     * The delegation JWT issued by the trust mark owner if this trust mark uses delegation.
     */
    delegation_jwt?: string;
    /**
     * Additional custom claims to include in the trust mark.
     */
    additional_claims?: AdditionalClaims;
};

