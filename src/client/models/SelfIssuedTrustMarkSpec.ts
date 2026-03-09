/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Specification for a self-issued trust mark. Used when the entity issues trust marks to itself.
 * Self-issued trust marks always refresh automatically based on the configured lifetime.
 */
export type SelfIssuedTrustMarkSpec = {
    /**
     * Lifetime of the self-issued trust mark, in seconds.
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
     * Additional custom claims (key-value pairs) to include in the self-issued trust mark.
     */
    additional_claims?: Record<string, unknown>;
    /**
     * Whether to include additional claims in the trust mark info endpoint response.
     */
    include_extra_claims_in_info?: boolean;
};
