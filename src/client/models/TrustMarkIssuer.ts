/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from './InternalID';
/**
 * A trust mark issuer object.
 */
export type TrustMarkIssuer = {
    /**
     * Internal identifier for this issuer record.
     */
    id: InternalID;
    /**
     * The issuer identifier (Entity ID).
     */
    issuer: string;
    /**
     * Optional human-readable description for this issuer.
     */
    description?: string;
};

