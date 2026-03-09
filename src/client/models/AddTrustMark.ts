/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SelfIssuedTrustMarkSpec } from './SelfIssuedTrustMarkSpec';
/**
 * Data to create a trust mark entry. Provide either:
 * (1) trust_mark_type and trust_mark_issuer to configure external trust mark fetching,
 * (2) trust_mark (JWT) directly, or
 * (3) self_issuance_spec for self-issued trust marks.
 */
export type AddTrustMark = {
    /**
     * The trust mark type identifier.
     */
    trust_mark_type?: string;
    /**
     * The issuer of the trust mark. Required when using external trust mark fetching.
     */
    trust_mark_issuer?: string;
    /**
     * The trust mark JWT. Provide this if you already have the JWT.
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

