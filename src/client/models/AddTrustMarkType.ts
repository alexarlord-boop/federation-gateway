/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddTrustMarkIssuer } from './AddTrustMarkIssuer';
import type { AddTrustMarkOwner } from './AddTrustMarkOwner';
/**
 * Data to add a trust mark type.
 */
export type AddTrustMarkType = {
    /**
     * The trust mark type identifier.
     */
    trust_mark_type: string;
    /**
     * Issuers authorized for this trust mark type.
     */
    trust_mark_issuers?: Array<AddTrustMarkIssuer>;
    /**
     * Optional owner to set for this trust mark type.
     */
    trust_mark_owner?: AddTrustMarkOwner;
};

