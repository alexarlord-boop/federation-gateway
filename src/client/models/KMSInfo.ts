/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KMSRotationOptions } from './KMSRotationOptions';
import type { SignatureAlgorithm } from './SignatureAlgorithm';
/**
 * Information about the active KMS and current signing algorithm.
 */
export type KMSInfo = {
    /**
     * Identifier or type of the active KMS.
     */
    kms: string;
    alg: SignatureAlgorithm;
    pending_alg?: SignatureAlgorithm;
    alg_change_at?: number | null;
    /**
     * Length of RSA keys in bits.
     */
    rsa_key_len: number;
    rotation?: KMSRotationOptions;
};

