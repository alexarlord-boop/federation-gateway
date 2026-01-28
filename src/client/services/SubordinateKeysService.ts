/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InternalID } from '../models/InternalID';
import type { Jwk } from '../models/Jwk';
import type { Jwks } from '../models/Jwks';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinateKeysService {
    /**
     * @param subordinateId The id of the subordinate
     * @returns Jwks Successful response returning the subordinate's JWKS.
     * @throws ApiError
     */
    public static getSubordinateJwks(
        subordinateId: InternalID,
    ): CancelablePromise<Jwks> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/jwks',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create or update the subordinate's jwks
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Jwks Successfully updated subordinate's jwks.
     * @throws ApiError
     */
    public static setSubordinateJwks(
        subordinateId: InternalID,
        requestBody: Jwks,
    ): CancelablePromise<Jwks> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/jwks',
            path: {
                'subordinateID': subordinateId,
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
     * Add a jwk to the subordinate's jwks
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Jwks Successfully added JWK to subordinate's jwks
     * @throws ApiError
     */
    public static addSubordinateJwk(
        subordinateId: InternalID,
        requestBody: Jwk,
    ): CancelablePromise<Jwks> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/jwks',
            path: {
                'subordinateID': subordinateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Deletes a JWK from the subordinate's jwks
     * @param subordinateId The id of the subordinate
     * @param kid The key ID (kid) of the key to delete
     * @returns Jwks Successfully deleted the key from the subordinate's jwks. Response contains the updated jwks.
     * @throws ApiError
     */
    public static deleteSubordinateJwk(
        subordinateId: any,
        kid: string,
    ): CancelablePromise<Jwks> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/jwks/{kid}',
            path: {
                'subordinateID': subordinateId,
                'kid': kid,
            },
        });
    }
}
