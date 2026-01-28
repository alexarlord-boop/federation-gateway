/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from './InternalID';
/**
 * Data to add or link a trust mark issuer.
 */
export type AddTrustMarkIssuer = ({
    /**
     * Reference to an existing global issuer (internal id).
     */
    issuer_id: InternalID;
} | {
    /**
     * The issuer identifier (Entity ID).
     */
    issuer: string;
    /**
     * Optional human-readable description for this issuer.
     */
    description?: string;
});

