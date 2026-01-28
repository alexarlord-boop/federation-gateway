/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from './InternalID';
/**
 * A trust mark entry.
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
     * The issuer of the trust mark.
     */
    trust_mark_issuer: string;
    /**
     * The trust mark JWT.
     */
    trust_mark: string;
};

