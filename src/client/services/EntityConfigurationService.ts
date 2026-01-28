/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddAdditionalClaim } from '../models/AddAdditionalClaim';
import type { AdditionalClaim } from '../models/AdditionalClaim';
import type { AdditionalClaims } from '../models/AdditionalClaims';
import type { AnyValue } from '../models/AnyValue';
import type { InternalID } from '../models/InternalID';
import type { LifetimeSeconds } from '../models/LifetimeSeconds';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EntityConfigurationService {
    /**
     * Get the entity configuration JSON
     * @returns AnyValue Successful response returning the entity configuration as it would also be returned from the /.well-known/openid-federation endpoint but as JSON.
     * @throws ApiError
     */
    public static getEntityConfiguration(): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * List all additional claims
     * @returns AdditionalClaims Successful response returning all additional claim rows.
     * @throws ApiError
     */
    public static getAdditionalClaims(): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/additional-claims',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Replace the complete additional claims
     * Use with care!
     * @param requestBody
     * @returns AdditionalClaims Successfully replaced all additional claim rows.
     * @throws ApiError
     */
    public static updateAdditionalClaims(
        requestBody: Array<AddAdditionalClaim>,
    ): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/additional-claims',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Merge additional claim rows
     * @param requestBody Additional claim to be added to the entity configuration.
     * @returns AdditionalClaim Successfully merged the provided additional claim rows.
     * @throws ApiError
     */
    public static addAdditionalClaims(
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/additional-claims',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get an additional claim row
     * @param additionalClaimId The ID of the additional claim.
     * @returns AdditionalClaim Successful response returning the additional claim row.
     * @throws ApiError
     */
    public static getAdditionalClaim(
        additionalClaimId: InternalID,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/additional-claims/{additionalClaimsID}',
            path: {
                'additionalClaimID': additionalClaimId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update an additional claim row
     * @param additionalClaimId The ID of the additional claim.
     * @param requestBody
     * @returns AdditionalClaim Successfully updated the additional claim row.
     * @throws ApiError
     */
    public static updateAdditionalClaim(
        additionalClaimId: InternalID,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/additional-claims/{additionalClaimsID}',
            path: {
                'additionalClaimID': additionalClaimId,
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
     * Delete an additional claim
     * @param additionalClaimId The ID of the additional claim.
     * @returns void
     * @throws ApiError
     */
    public static deleteAdditionalClaim(
        additionalClaimId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/additional-claims/{additionalClaimsID}',
            path: {
                'additionalClaimID': additionalClaimId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get entity configuration lifetime
     * @returns LifetimeSeconds Successful response returning the entity-configuration lifetime in seconds.
     * @throws ApiError
     */
    public static getEntityConfigurationLifetime(): CancelablePromise<LifetimeSeconds> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/lifetime',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update entity configuration lifetime
     * @param requestBody
     * @returns LifetimeSeconds Successfully updated the entity-configuration lifetime in seconds.
     * @throws ApiError
     */
    public static updateEntityConfigurationLifetime(
        requestBody: LifetimeSeconds,
    ): CancelablePromise<LifetimeSeconds> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/lifetime',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
}
