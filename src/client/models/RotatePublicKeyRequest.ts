/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Jwk } from './Jwk';
/**
 * Request body for rotating a public key.
 */
export type RotatePublicKeyRequest = {
    key: Jwk;
    iat?: number | null;
    nbf?: number | null;
    exp?: number | null;
    old_key_exp?: number | null;
};

