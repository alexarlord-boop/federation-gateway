/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EligibilityConfig } from './EligibilityConfig';
/**
 * Data to create or update a TrustMarkSpec.
 */
export type AddTrustMarkSpec = {
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
     * General additional claims (simple key-value map).
     */
    additional_claims?: Record<string, any>;
    /**
     * Configuration for determining trust mark eligibility.
     */
    eligibility_config?: EligibilityConfig;
    /**
     * How long to cache issued trust marks for this type, in seconds.
     * Set to 0 (default) to disable caching.
     *
     */
    cache_ttl?: number;
};

