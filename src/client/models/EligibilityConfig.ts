/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityCheckerConfig } from './EntityCheckerConfig';
/**
 * Configuration for determining trust mark eligibility.
 * Defines how dynamic entity checks are combined with the database subject list.
 *
 */
export type EligibilityConfig = {
    /**
     * How eligibility is determined:
     * - db_only: Only subjects in TrustMarkSubject DB with active status (default)
     * - check_only: Only run entity checker, ignore DB
     * - db_or_check: DB active status OR checker passes
     * - db_and_check: DB active status AND checker passes
     * - custom: Fully custom checker composition (db_list can be a sub-checker)
     *
     */
    mode?: EligibilityConfig.mode;
    /**
     * Entity checker configuration (used based on mode).
     */
    checker?: EntityCheckerConfig;
    /**
     * Seconds to cache eligibility check results for unknown subjects.
     * 0 = no caching. Default: 10 seconds.
     *
     */
    check_cache_ttl?: number;
};
export namespace EligibilityConfig {
    /**
     * How eligibility is determined:
     * - db_only: Only subjects in TrustMarkSubject DB with active status (default)
     * - check_only: Only run entity checker, ignore DB
     * - db_or_check: DB active status OR checker passes
     * - db_and_check: DB active status AND checker passes
     * - custom: Fully custom checker composition (db_list can be a sub-checker)
     *
     */
    export enum mode {
        DB_ONLY = 'db_only',
        CHECK_ONLY = 'check_only',
        DB_OR_CHECK = 'db_or_check',
        DB_AND_CHECK = 'db_and_check',
        CUSTOM = 'custom',
    }
}

