/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddAdditionalClaim } from '../models/AddAdditionalClaim';
import type { AdditionalClaim } from '../models/AdditionalClaim';
import type { AdditionalClaims } from '../models/AdditionalClaims';
import type { AddSubordinate } from '../models/AddSubordinate';
import type { AnyValue } from '../models/AnyValue';
import type { InternalID } from '../models/InternalID';
import type { LifetimeSeconds } from '../models/LifetimeSeconds';
import type { Subordinate } from '../models/Subordinate';
import type { SubordinateDetails } from '../models/SubordinateDetails';
import type { SubordinateHistory } from '../models/SubordinateHistory';
import type { UpdateSubordinate } from '../models/UpdateSubordinate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubordinatesService {
    /**
     * List subordinates
     * Get a list of subordinates, optionally filtered by entity_type and/or status.
     * @param entityType Optional filter by registered entity type
     * @param status Optional filter by subordinate status
     * @returns Subordinate Successful response returning list of subordinates.
     * @throws ApiError
     */
    public static listSubordinates(
        entityType?: string,
        status?: string,
    ): CancelablePromise<Array<Subordinate>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates',
            query: {
                'entity_type': entityType,
                'status': status,
            },
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create a subordinate
     * @param requestBody
     * @returns Subordinate Subordinate created successfully.
     * @throws ApiError
     */
    public static createSubordinate(
        requestBody: AddSubordinate,
    ): CancelablePromise<Subordinate> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get general subordinate lifetime
     * @returns LifetimeSeconds Successful response returning the general subordinate lifetime in seconds.
     * @throws ApiError
     */
    public static getGeneralSubordinateLifetime(): CancelablePromise<LifetimeSeconds> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/lifetime',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update general subordinate lifetime
     * @param requestBody
     * @returns LifetimeSeconds Successfully updated the general subordinate lifetime in seconds.
     * @throws ApiError
     */
    public static updateGeneralSubordinateLifetime(
        requestBody: LifetimeSeconds,
    ): CancelablePromise<LifetimeSeconds> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/lifetime',
            body: requestBody,
            mediaType: 'text/plain',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List all general additional claims
     * @returns AdditionalClaims Successful response returning all general additional claims for subordinates.
     * @throws ApiError
     */
    public static getGeneralAdditionalClaims(): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/additional-claims',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update the complete general additional claims structure
     * Use with care!
     * @param requestBody
     * @returns AdditionalClaims Successfully updated the complete general additional claims object.
     * @throws ApiError
     */
    public static updateGeneralAdditionalClaims(
        requestBody: Array<AddAdditionalClaim>,
    ): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/additional-claims',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Add a general additional claim
     * @param requestBody A single additional claim to be added to the general subordinate claims.
     * @returns AdditionalClaim Successfully added the provided general additional claim.
     * @throws ApiError
     */
    public static addGeneralAdditionalClaim(
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/additional-claims',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                409: `The request conflicts with existing data (e.g., duplicate claim name)`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get a general additional claim row
     * @param additionalClaimsId The ID of the additional claim.
     * @returns AdditionalClaim Successful response returning the claim row.
     * @throws ApiError
     */
    public static getGeneralAdditionalClaim(
        additionalClaimsId: InternalID,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
            path: {
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a general additional claim row
     * @param additionalClaimsId The ID of the additional claim.
     * @param requestBody
     * @returns AdditionalClaim Successfully updated the claim row.
     * @throws ApiError
     */
    public static updateGeneralAdditionalClaim(
        additionalClaimsId: InternalID,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
            path: {
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
     * Delete a general additional claim
     * @param additionalClaimsId The ID of the additional claim.
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralAdditionalClaim(
        additionalClaimsId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
            path: {
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List subordinate-specific additional claims
     * @param subordinateId The id of the subordinate
     * @returns AdditionalClaims Successful response returning all subordinate-specific additional claim rows.
     * @throws ApiError
     */
    public static getSubordinateAdditionalClaims(
        subordinateId: InternalID,
    ): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims',
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
     * Update subordinate-specific additional claims
     * Use with care!
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns AdditionalClaims Successfully replaced all subordinate-specific additional claim rows.
     * @throws ApiError
     */
    public static updateSubordinateAdditionalClaims(
        subordinateId: InternalID,
        requestBody: Array<AddAdditionalClaim>,
    ): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims',
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
     * Add an additional claim for a subordinate
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns AdditionalClaim Successfully merged the provided subordinate-specific additional claim rows.
     * @throws ApiError
     */
    public static addSubordinateAdditionalClaims(
        subordinateId: InternalID,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims',
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
     * Get a subordinate additional claim row
     * @param subordinateId The id of the subordinate
     * @param additionalClaimsId The ID of the subordinate-specific additional claim row.
     * @returns AdditionalClaim Successful response returning the claim row.
     * @throws ApiError
     */
    public static getSubordinateAdditionalClaim(
        subordinateId: InternalID,
        additionalClaimsId: number,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims/{additionalClaimsID}',
            path: {
                'subordinateID': subordinateId,
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update a subordinate additional claim row
     * @param subordinateId The id of the subordinate
     * @param additionalClaimsId The ID of the subordinate-specific additional claim row.
     * @param requestBody
     * @returns AdditionalClaim Successfully updated the claim row.
     * @throws ApiError
     */
    public static updateSubordinateAdditionalClaim(
        subordinateId: InternalID,
        additionalClaimsId: number,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims/{additionalClaimsID}',
            path: {
                'subordinateID': subordinateId,
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
     * Delete a subordinate additional claim
     * @param subordinateId The id of the subordinate
     * @param additionalClaimsId The ID of the subordinate-specific additional claim row.
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinateAdditionalClaim(
        subordinateId: InternalID,
        additionalClaimsId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}/additional-claims/{additionalClaimsID}',
            path: {
                'subordinateID': subordinateId,
                'additionalClaimsID': additionalClaimsId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate statement JSON
     * @param subordinateId The id of the subordinate
     * @returns AnyValue Successful response returning the subordinate statement as JSON.
     * @throws ApiError
     */
    public static getSubordinateStatement(
        subordinateId: InternalID,
    ): CancelablePromise<AnyValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/statement',
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
     * Get subordinate details
     * @param subordinateId The id of the subordinate
     * @returns SubordinateDetails Successful response returning subordinate details.
     * @throws ApiError
     */
    public static getSubordinateDetails(
        subordinateId: InternalID,
    ): CancelablePromise<SubordinateDetails> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}',
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
     * Update subordinate details
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns SubordinateDetails Successfully updated subordinate details.
     * @throws ApiError
     */
    public static updateSubordinateDetails(
        subordinateId: InternalID,
        requestBody: UpdateSubordinate,
    ): CancelablePromise<SubordinateDetails> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}',
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
     * Delete a subordinate
     * @param subordinateId The id of the subordinate
     * @returns void
     * @throws ApiError
     */
    public static deleteSubordinate(
        subordinateId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/{subordinateID}',
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
     * Change subordinate status
     * Change the status of a subordinate entity.
     * Note: Setting status to "active" requires the subordinate to have at least one key in its JWKS.
     *
     * The request body should be a plain text status value (one of: active, blocked, pending, inactive).
     *
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Subordinate Successfully changed subordinate status.
     * @throws ApiError
     */
    public static changeSubordinateStatus(
        subordinateId: InternalID,
        requestBody: 'active' | 'blocked' | 'pending' | 'inactive',
    ): CancelablePromise<Subordinate> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/status',
            path: {
                'subordinateID': subordinateId,
            },
            body: requestBody,
            mediaType: 'text/plain',
            errors: {
                400: `Bad request. This can occur if:
                - The status value is invalid
                - Attempting to set status to "active" when the subordinate has no keys
                `,
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get subordinate event history
     * Retrieves the event history for a subordinate. Events are ordered by timestamp descending (newest first).
     *
     * Supports pagination via `limit` and `offset` parameters, and filtering by event type and timestamp range.
     *
     * @param subordinateId The id of the subordinate
     * @param limit Maximum number of events to return (default 50, max 100).
     * @param offset Number of events to skip for pagination.
     * @param type Filter events by type.
     * @param from Filter events with timestamp >= this value (unix seconds).
     * @param to Filter events with timestamp <= this value (unix seconds).
     * @returns SubordinateHistory Successful response returning the subordinate's event history with pagination.
     * @throws ApiError
     */
    public static getSubordinateHistory(
        subordinateId: InternalID,
        limit: number = 50,
        offset?: number,
        type?: 'created' | 'deleted' | 'status_updated' | 'updated' | 'jwk_added' | 'jwk_removed' | 'jwks_replaced' | 'metadata_updated' | 'metadata_deleted' | 'policy_updated' | 'policy_deleted' | 'constraints_updated' | 'constraints_deleted' | 'claims_updated' | 'claim_deleted',
        from?: number,
        to?: number,
    ): CancelablePromise<SubordinateHistory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/history',
            path: {
                'subordinateID': subordinateId,
            },
            query: {
                'limit': limit,
                'offset': offset,
                'type': type,
                'from': from,
                'to': to,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
