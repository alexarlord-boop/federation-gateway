/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EligibilityConfig } from './EligibilityConfig';
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
     * General additional claims (simple key-value map) included in all trust marks of this type.
     * Example: {"org_name": "Federation", "level": "standard"}
     *
     */
    additional_claims?: Record<string, any>;
    /**
     * Configuration for determining trust mark eligibility.
     */
    eligibility_config?: EligibilityConfig;
    /**
     * How long to cache issued trust marks for this type, in seconds.
     * When a trust mark is requested, if a cached version exists and has not expired,
     * it will be returned instead of issuing a new one. This reduces signing operations
     * and database writes for repeated requests.
     *
     * The actual cache duration is the minimum of this value and the time until the
     * trust mark expires (based on the `lifetime` field).
     *
     * Set to 0 (default) to disable caching - a new trust mark JWT will be issued
     * and persisted for each request.
     *
     */
    cache_ttl?: number;
};

