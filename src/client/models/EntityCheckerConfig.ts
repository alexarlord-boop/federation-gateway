/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Configuration for an entity checker that validates entities for trust mark eligibility.
 *
 */
export type EntityCheckerConfig = {
    /**
     * Checker type. Built-in types:
     * - none: always passes
     * - db_list: checks TrustMarkSubject table for active status
     * - trust_mark: entity must have specific trust mark
     * - trust_path: entity must have valid trust path to trust anchors
     * - authority_hints: entity must have specific authority hints
     * - entity_id: entity ID must be in allowed list
     * - http_list: fetch entity list from HTTP endpoint (JSON array)
     * - http_list_jwt: fetch signed JWT entity list from HTTP endpoint
     * - multiple_and: all sub-checkers must pass
     * - multiple_or: any sub-checker passes
     *
     */
    type: string;
    /**
     * Type-specific configuration. Examples:
     * - trust_path: {"trust_anchors": [{"entity_id": "https://ta.example.org"}]}
     * - entity_id: {"entity_ids": ["https://entity1.example.org", "https://entity2.example.org"]}
     * - http_list: {"url": "https://api.example.org/entities", "cache_ttl": 300}
     * - http_list_jwt: {"url": "...", "verification": {"mode": "trust_anchor", "trust_anchors": [...]}}
     * - multiple_and/multiple_or: array of EntityCheckerConfig objects
     *
     */
    config?: Record<string, any>;
};

