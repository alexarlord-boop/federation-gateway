/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Jwk } from './Jwk';
/**
 * A public key entry managed by the API.
 */
export type PublicKeyEntry = {
    /**
     * Key ID
     */
    kid: string;
    key: Jwk;
    /**
     * Time at which this key was issued.
     */
    iat?: number | null;
    /**
     * Time from which the key is valid.
     */
    nbf?: number | null;
    /**
     * Expiry time of the key.
     */
    exp?: number | null;
    /**
     * Revocation time if revoked.
     */
    revoked_at?: number | null;
    /**
     * Optional reason for revocation.
     */
    reason?: string;
};

