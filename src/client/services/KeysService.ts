/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPublicKeyEntry } from '../models/AddPublicKeyEntry';
import type { AnyValue } from '../models/AnyValue';
import type { KMSInfo } from '../models/KMSInfo';
import type { KMSRotationOptions } from '../models/KMSRotationOptions';
import type { PublicKeyEntry } from '../models/PublicKeyEntry';
import type { RotatePublicKeyRequest } from '../models/RotatePublicKeyRequest';
import type { SignatureAlgorithm } from '../models/SignatureAlgorithm';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class KeysService {
    /**
     * Get published JWKS
     * @returns AnyValue Successful response returning JWKS as published in the entity configuration.
     * @throws ApiError
     */
    public static getPublishedJwks(): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/jwks',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * List API-managed public keys
     * @returns PublicKeyEntry Successful response returning the list of API-managed public keys.
     * @throws ApiError
     */
    public static listPublicKeys(): CancelablePromise<Array<PublicKeyEntry>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/keys',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Add a new public key
     * @param requestBody
     * @returns PublicKeyEntry Successfully added the public key.
     * @throws ApiError
     */
    public static addPublicKey(
        requestBody: AddPublicKeyEntry,
    ): CancelablePromise<PublicKeyEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/keys',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Remove a public key
     * @param kid
     * @param revoke If true, marks the key as revoked instead of hard delete.
     * @param reason Optional reason when revoking the key.
     * @returns void
     * @throws ApiError
     */
    public static deletePublicKey(
        kid: string,
        revoke: boolean = false,
        reason?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/keys/{kid}',
            path: {
                'kid': kid,
            },
            query: {
                'revoke': revoke,
                'reason': reason,
            },
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update public key metadata
     * @param kid
     * @param requestBody
     * @returns PublicKeyEntry Successfully updated the key metadata.
     * @throws ApiError
     */
    public static updatePublicKeyMetadata(
        kid: string,
        requestBody: {
            exp?: number | null;
        },
    ): CancelablePromise<PublicKeyEntry> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/keys/{kid}',
            path: {
                'kid': kid,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Rotate a public key
     * @param kid
     * @param requestBody
     * @returns PublicKeyEntry Successfully rotated the public key, marking previous as expired.
     * @throws ApiError
     */
    public static rotatePublicKey(
        kid: string,
        requestBody: RotatePublicKeyRequest,
    ): CancelablePromise<PublicKeyEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/keys/{kid}',
            path: {
                'kid': kid,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get KMS information
     * Returns which KMS is active and which signing algorithm is configured.
     * @returns KMSInfo Returns information about the active KMS and signing algorithm.
     * @throws ApiError
     */
    public static getKmsInfo(): CancelablePromise<KMSInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/kms',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update KMS signing algorithm
     * Change the active signing algorithm.
     * @param requestBody
     * @returns KMSInfo Successfully updated signing algorithm.
     * @throws ApiError
     */
    public static updateKmsAlg(
        requestBody: SignatureAlgorithm,
    ): CancelablePromise<KMSInfo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/kms/alg',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update KMS RSA Key Length
     * Change the key length of newly generated RSA keys.
     * @param requestBody
     * @returns KMSInfo Successfully updated signing algorithm.
     * @throws ApiError
     */
    public static updateKmsrsaKeyLen(
        requestBody: number,
    ): CancelablePromise<KMSInfo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/kms/rsa-key-len',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get KMS rotation options
     * @returns KMSRotationOptions Returns rotation options and whether rotation is enabled.
     * @throws ApiError
     */
    public static getKmsRotationOptions(): CancelablePromise<KMSRotationOptions> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/kms/rotation',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update KMS rotation options
     * @param requestBody
     * @returns KMSRotationOptions Successfully updated rotation options.
     * @throws ApiError
     */
    public static updateKmsRotationOptions(
        requestBody: KMSRotationOptions,
    ): CancelablePromise<KMSRotationOptions> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/kms/rotation',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Patch KMS rotation options
     * @param requestBody
     * @returns KMSRotationOptions Successfully patched rotation options.
     * @throws ApiError
     */
    public static patchKmsRotationOptions(
        requestBody: KMSRotationOptions,
    ): CancelablePromise<KMSRotationOptions> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/kms/rotation',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Trigger KMS key rotation
     * @param revoke If true, mark the old key as revoked instead of just expiring it.
     * @param reason Optional reason when revoking the old key.
     * @returns any Successfully rotated signing key.
     * @throws ApiError
     */
    public static triggerKmsRotation(
        revoke: boolean = false,
        reason?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/kms/rotate',
            query: {
                'revoke': revoke,
                'reason': reason,
            },
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
}
