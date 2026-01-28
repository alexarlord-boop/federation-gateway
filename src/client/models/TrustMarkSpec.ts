/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdditionalClaims } from './AdditionalClaims';
import type { InternalID } from './InternalID';
/**
 * Specification describing a trust mark type that can be issued.
 */
export type TrustMarkSpec = {
    /**
     * Internal identifier for this TrustMarkSpec.
     */
    readonly id: InternalID;
    /**
     * The trust mark type identifier.
     */
    trust_mark_type: string;
    /**
     * Optional human-readable description for this TrustMarkSpec.
     */
    description?: string;
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

