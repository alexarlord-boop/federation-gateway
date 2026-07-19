/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddTrustMark } from '../models/AddTrustMark';
import type { InternalID } from '../models/InternalID';
import type { TrustMark } from '../models/TrustMark';
import type { UpdateTrustMark } from '../models/UpdateTrustMark';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EntityConfigurationTrustMarksService {
    /**
     * List trust marks in the entity configuration
     * @returns TrustMark Successful response - returns an array of trust marks with their configuration.
     * @throws ApiError
     */
    public static listEntityConfigurationTrustMarks(): CancelablePromise<Array<TrustMark>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/trust-marks',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create a trust mark in the entity configuration
     * @param requestBody Create a trust mark. Provide one of: (1) `trust_mark_type` and `trust_mark_issuer` for external fetching, (2) `trust_mark` (JWT) directly, or (3) `self_issuance_spec` for self-issued trust marks.
     * @returns TrustMark Successful response - returns the created trust mark.
     * @throws ApiError
     */
    public static createEntityConfigurationTrustMark(
        requestBody: AddTrustMark,
    ): CancelablePromise<TrustMark> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/entity-configuration/trust-marks',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get a trust mark
     * @param trustMarkId A unique identifier for a Trust Mark
     * @returns TrustMark Successful response - returns a single trust mark.
     * @throws ApiError
     */
    public static getEntityConfigurationTrustMark(
        trustMarkId: InternalID,
    ): CancelablePromise<TrustMark> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/entity-configuration/trust-marks/{trustMarkID}',
            path: {
                'trustMarkID': trustMarkId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Replace a trust mark
     * @param trustMarkId A unique identifier for a Trust Mark
     * @param requestBody Replace a trust mark configuration entirely. All fields should be provided; omitted fields will be reset to defaults or cleared.
     * @returns TrustMark Successful response - returns the replaced trust mark.
     * @throws ApiError
     */
    public static replaceEntityConfigurationTrustMark(
        trustMarkId: InternalID,
        requestBody: AddTrustMark,
    ): CancelablePromise<TrustMark> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/entity-configuration/trust-marks/{trustMarkID}',
            path: {
                'trustMarkID': trustMarkId,
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
     * Partially update a trust mark
     * @param trustMarkId A unique identifier for a Trust Mark
     * @param requestBody Partially update a trust mark configuration. Only provided fields will be updated.
     * @returns TrustMark Successful response - returns the updated trust mark.
     * @throws ApiError
     */
    public static patchEntityConfigurationTrustMark(
        trustMarkId: InternalID,
        requestBody: UpdateTrustMark,
    ): CancelablePromise<TrustMark> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/entity-configuration/trust-marks/{trustMarkID}',
            path: {
                'trustMarkID': trustMarkId,
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
     * Delete a trust mark
     * @param trustMarkId A unique identifier for a Trust Mark
     * @returns void
     * @throws ApiError
     */
    public static deleteEntityConfigurationTrustMark(
        trustMarkId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/entity-configuration/trust-marks/{trustMarkID}',
            path: {
                'trustMarkID': trustMarkId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
