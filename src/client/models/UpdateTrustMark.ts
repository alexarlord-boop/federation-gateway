/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SelfIssuedTrustMarkSpec } from './SelfIssuedTrustMarkSpec';
/**
 * Data to partially update a trust mark.
 */
export type UpdateTrustMark = {
    /**
     * The issuer of the trust mark.
     */
    trust_mark_issuer?: string;
    /**
     * The trust mark JWT.
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

