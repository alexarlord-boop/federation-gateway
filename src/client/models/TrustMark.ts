/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from './InternalID';
import type { SelfIssuedTrustMarkSpec } from './SelfIssuedTrustMarkSpec';
/**
 * A trust mark entry in the entity configuration.
 */
export type TrustMark = {
    /**
     * Internal identifier for this trust mark.
     */
    id: InternalID;
    /**
     * The trust mark type identifier.
     */
    trust_mark_type: string;
    /**
     * The issuer of the trust mark. Required when not using self-issuance.
     */
    trust_mark_issuer?: string;
    /**
     * The trust mark JWT. May be empty if refresh is enabled and trust mark has not yet been fetched.
     */
    trust_mark?: string;
    /**
     * Whether automatic refresh of this trust mark is enabled.
     */
    refresh?: boolean;
    /**
     * Minimum remaining lifetime (in seconds) before a refresh is triggered.
     */
    min_lifetime?: number;
    /**
     * Grace period (in seconds) after expiration during which refresh is still attempted.
     */
    refresh_grace_period?: number;
    /**
     * Minimum time (in seconds) between refresh attempts.
     */
    refresh_rate_limit?: number;
    /**
     * Specification for self-issued trust marks.
     */
    self_issuance_spec?: SelfIssuedTrustMarkSpec;
};

