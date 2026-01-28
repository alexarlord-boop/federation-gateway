/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * JSON object that contains the properties of the revocation
 */
export type Revoked = {
    /**
     * Time when the key was revoked or must be considered revoked
     */
    revoked_at: number;
    /**
     * String that identifies the reason for the key revocation
     */
    reason?: string;
};

