/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SignatureAlgorithm } from './SignatureAlgorithm';
export type Jwk = {
    /**
     * The key type (e.g., EC).
     */
    kty: string;
    /**
     * The elliptic curve used (only for EC keys).
     */
    crv?: string | null;
    /**
     * The key ID.
     */
    kid: string;
    /**
     * The X coordinate for EC keys (optional).
     */
    'x'?: string | null;
    /**
     * The Y coordinate for EC keys (optional).
     */
    'y'?: string | null;
    /**
     * The modulus for RSA keys.
     */
    'n'?: string | null;
    /**
     * The exponent for RSA keys.
     */
    'e'?: string | null;
    /**
     * The algorithm associated with the key.
     */
    alg?: SignatureAlgorithm | null;
    /**
     * The intended use of the key (e.g., sig, enc).
     */
    use?: string | null;
    /**
     * A URL that points to an X.509 public key certificate or certificate chain.
     */
    x5u?: string | null;
    /**
     * The X.509 certificate chain.
     */
    x5c?: Array<string> | null;
    /**
     * The SHA-1 thumbprint of the X.509 certificate.
     */
    x5t?: string | null;
    /**
     * The SHA-256 thumbprint of the X.509 certificate.
     */
    x5tS256?: string | null;
};

