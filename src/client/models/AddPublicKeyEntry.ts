/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Jwk } from './Jwk';
/**
 * Request to add a new public key.
 */
export type AddPublicKeyEntry = {
    key: Jwk;
    /**
     * Time at which this key was issued.
     */
    iat?: number | null;
    nbf?: number | null;
    exp?: number | null;
};

