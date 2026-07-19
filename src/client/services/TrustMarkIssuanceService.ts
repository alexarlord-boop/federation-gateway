/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddTrustMarkSpec } from '../models/AddTrustMarkSpec';
import type { AddTrustMarkSubject } from '../models/AddTrustMarkSubject';
import type { InternalID } from '../models/InternalID';
import type { PatchTrustMarkSpec } from '../models/PatchTrustMarkSpec';
import type { TrustMarkSpec } from '../models/TrustMarkSpec';
import type { TrustMarkSubject } from '../models/TrustMarkSubject';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TrustMarkIssuanceService {
    /**
     * List all TrustMarkSpecs
     * Gets a list of all `TrustMarkSpec` entities.
     * @returns TrustMarkSpec Successful response - returns an array of `TrustMarkSpec` entities.
     * @throws ApiError
     */
    public static getTrustMarkIssuanceSpecs(): CancelablePromise<Array<TrustMarkSpec>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create a TrustMarkSpec
     * Creates a new instance of a `TrustMarkSpec`.
     * @param requestBody A new `TrustMarkSpec` to be created.
     * @returns TrustMarkSpec Successful response - returns the created `TrustMarkSpec`.
     * @throws ApiError
     */
    public static createTrustMarkIssuanceSpec(
        requestBody: AddTrustMarkSpec,
    ): CancelablePromise<TrustMarkSpec> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/issuance-spec',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get a TrustMarkSpec
     * Gets the details of a single instance of a `TrustMarkSpec`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @returns TrustMarkSpec Successful response - returns a single `TrustMarkSpec`.
     * @throws ApiError
     */
    public static getTrustMarkIssuanceSpec(
        trustMarkSpecId: InternalID,
    ): CancelablePromise<TrustMarkSpec> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a TrustMarkSpec
     * Updates an existing `TrustMarkSpec`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param requestBody Updated `TrustMarkSpec` information.
     * @returns TrustMarkSpec Successful response - returns the updated `TrustMarkSpec`.
     * @throws ApiError
     */
    public static updateTrustMarkIssuanceSpec(
        trustMarkSpecId: InternalID,
        requestBody: AddTrustMarkSpec,
    ): CancelablePromise<TrustMarkSpec> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
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
     * Patch a TrustMarkSpec
     * Partially updates fields of an existing `TrustMarkSpec`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param requestBody Partial `TrustMarkSpec` fields to update.
     * @returns TrustMarkSpec Successful response - returns the patched `TrustMarkSpec`.
     * @throws ApiError
     */
    public static patchTrustMarkIssuanceSpec(
        trustMarkSpecId: InternalID,
        requestBody: PatchTrustMarkSpec,
    ): CancelablePromise<TrustMarkSpec> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
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
     * Delete a TrustMarkSpec
     * Deletes an existing `TrustMarkSpec`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @returns void
     * @throws ApiError
     */
    public static deleteTrustMarkIssuanceSpec(
        trustMarkSpecId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List TrustMarkSubjects
     * Gets a list of `TrustMarkSubject` for the specified TrustMarkSpec.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param status Optional filter for subject status.
     * @returns TrustMarkSubject Successful response - returns an array of `TrustMarkSubject`.
     * @throws ApiError
     */
    public static listTrustMarkSubjects(
        trustMarkSpecId: InternalID,
        status?: string,
    ): CancelablePromise<Array<TrustMarkSubject>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
            },
            query: {
                'status': status,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create a TrustMarkSubject
     * Creates a new instance of a `TrustMarkSubject`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param requestBody A new `TrustMarkSubject` to be created.
     * @returns TrustMarkSubject Successful response - returns the created `TrustMarkSubject`.
     * @throws ApiError
     */
    public static createTrustMarkSubject(
        trustMarkSpecId: InternalID,
        requestBody: AddTrustMarkSubject,
    ): CancelablePromise<TrustMarkSubject> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get a TrustMarkSubject
     * Gets the details of a single instance of a `TrustMarkSubject`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @returns TrustMarkSubject Successful response - returns a single `TrustMarkSubject`.
     * @throws ApiError
     */
    public static getTrustMarkSubject(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
    ): CancelablePromise<TrustMarkSubject> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a TrustMarkSubject
     * Updates an existing `TrustMarkSubject`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param requestBody Updated `TrustMarkSubject` information.
     * @returns TrustMarkSubject Successful response - returns the updated `TrustMarkSubject`.
     * @throws ApiError
     */
    public static updateTrustMarkSubject(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        requestBody: AddTrustMarkSubject,
    ): CancelablePromise<TrustMarkSubject> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
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
     * Delete a TrustMarkSubject
     * Deletes an existing `TrustMarkSubject`.
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @returns void
     * @throws ApiError
     */
    public static deleteTrustMarkSubject(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Change TrustMarkSubject status
     * Change the status of a TrustMarkSubject.
     * The request body should be a plain text status value (one of: active, blocked, pending, inactive).
     *
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param requestBody
     * @returns TrustMarkSubject Successfully changed TrustMarkSubject status.
     * @throws ApiError
     */
    public static changeTrustMarkSubjectStatus(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        requestBody: 'active' | 'blocked' | 'pending' | 'inactive',
    ): CancelablePromise<TrustMarkSubject> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/status',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
            },
            body: requestBody,
            mediaType: 'text/plain',
            errors: {
                400: `Invalid request parameters`,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subject additional claims
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @returns any Successful response returning the subject's additional claims map.
     * @throws ApiError
     */
    public static getTrustMarkSubjectAdditionalClaims(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Replace subject additional claims
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param requestBody
     * @returns any Successfully replaced the subject's additional claims.
     * @throws ApiError
     */
    public static updateTrustMarkSubjectAdditionalClaims(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        requestBody: Record<string, any>,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
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
     * Copy general claims from spec to subject
     * Merges the additional claims from the TrustMarkSpec into the subject's existing claims.
     * The spec's claims are used as a base, and the subject's existing claims are overlaid on top.
     * This means existing subject claims take precedence on conflict.
     *
     * Example:
     * - Spec claims: {"org_name": "Default", "level": "standard"}
     * - Subject claims: {"level": "premium", "custom": "value"}
     * - Result: {"org_name": "Default", "level": "premium", "custom": "value"}
     *
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @returns any Successfully merged the spec's general claims into the subject's claims.
     * @throws ApiError
     */
    public static copyTrustMarkSubjectAdditionalClaims(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
