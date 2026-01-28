/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from './InternalID';
/**
 * A single additional custom claim consisting of claim name, value, and crit flag.
 */
export type AdditionalClaim = {
    /**
     * Internal identifier for this additional claim row
     */
    id: InternalID;
    /**
     * The claim name
     */
    claim: string;
    /**
     * The claim value (arbitrary JSON)
     */
    value: any;
    /**
     * Whether the claim is critical
     */
    crit?: boolean;
};

