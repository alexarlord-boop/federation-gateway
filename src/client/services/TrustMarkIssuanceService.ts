/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddAdditionalClaim } from '../models/AddAdditionalClaim';
import type { AdditionalClaim } from '../models/AdditionalClaim';
import type { AdditionalClaims } from '../models/AdditionalClaims';
import type { AddTrustMarkSpec } from '../models/AddTrustMarkSpec';
import type { AddTrustMarkSubject } from '../models/AddTrustMarkSubject';
import type { InternalID } from '../models/InternalID';
import type { PatchTrustMarkSpec } from '../models/PatchTrustMarkSpec';
import type { TrustMarkSpec } from '../models/TrustMarkSpec';
import type { TrustMarkSubject } from '../models/TrustMarkSubject';
import type { TrustMarkSubjectStatus } from '../models/TrustMarkSubjectStatus';
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
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param requestBody
     * @returns TrustMarkSubject Successfully changed TrustMarkSubject status.
     * @throws ApiError
     */
    public static changeTrustMarkSubjectStatus(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        requestBody: TrustMarkSubjectStatus,
    ): CancelablePromise<TrustMarkSubject> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/status',
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
     * List subject-specific additional claims
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @returns AdditionalClaims Successful response returning all subject-specific additional claims.
     * @throws ApiError
     */
    public static getTrustMarkSubjectAdditionalClaims(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
    ): CancelablePromise<AdditionalClaims> {
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
     * Update subject-specific additional claims
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param requestBody
     * @returns AdditionalClaims Successfully updated the complete subject-specific additional claims object.
     * @throws ApiError
     */
    public static updateTrustMarkSubjectAdditionalClaims(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        requestBody: AdditionalClaims,
    ): CancelablePromise<AdditionalClaims> {
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
     * Get a subject additional claim row
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param additionalClaimsId The ID of the subject-specific additional claim row.
     * @returns AdditionalClaim Successful response returning the claim row.
     * @throws ApiError
     */
    public static getTrustMarkSubjectAdditionalClaim(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        additionalClaimsId: number,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims/{additionalClaimsID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a subject additional claim row
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param additionalClaimsId The ID of the subject-specific additional claim row.
     * @param requestBody
     * @returns AdditionalClaim Successfully updated the claim row.
     * @throws ApiError
     */
    public static updateTrustMarkSubjectAdditionalClaim(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        additionalClaimsId: number,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims/{additionalClaimsID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
                'additionalClaimsID': additionalClaimsId,
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
     * Delete a subject additional claim
     * @param trustMarkSpecId A unique identifier for a TrustMarkSpec
     * @param trustMarkSubjectId A unique identifier for a TrustMarkSubject
     * @param additionalClaimsId The ID of the subject-specific additional claim row.
     * @returns void
     * @throws ApiError
     */
    public static deleteTrustMarkSubjectAdditionalClaim(
        trustMarkSpecId: InternalID,
        trustMarkSubjectId: InternalID,
        additionalClaimsId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/trust-marks/issuance-spec/{trustMarkSpecID}/subjects/{trustMarkSubjectID}/additional-claims/{additionalClaimsID}',
            path: {
                'trustMarkSpecID': trustMarkSpecId,
                'trustMarkSubjectID': trustMarkSubjectId,
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
