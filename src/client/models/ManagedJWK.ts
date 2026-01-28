/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Jwk } from './Jwk';
export type ManagedJWK = (Jwk & {
    /**
     * The Key Management System
     */
    kms?: string;
    /**
     * The KMS Key reference (the id of the key in the KMS) if supported
     */
    kms_key_ref?: string;
    /**
     * The timestamp when the JWK was created.
     */
    iat?: number | null;
    /**
     * The time when the key expires and will not be valid anymore.
     */
    exp?: number;
});

