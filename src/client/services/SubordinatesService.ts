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
import type { SubordinateStatus } from '../models/SubordinateStatus';
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
            mediaType: 'application/json',
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
        requestBody: AdditionalClaims,
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
     * Add general additional claims
     * @param requestBody Additional claims to be added (merged) into the general subordinate claims.
     * @returns AdditionalClaims Successfully added the provided general additional claims.
     * @throws ApiError
     */
    public static addGeneralAdditionalClaims(
        requestBody: AdditionalClaims,
    ): CancelablePromise<AdditionalClaims> {
        return __request(OpenAPI, {
            method: 'POST',
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
     * Get a general additional claim row
     * @param additionalClaimId The ID of the additional claim.
     * @returns AdditionalClaim Successful response returning the claim row.
     * @throws ApiError
     */
    public static getGeneralAdditionalClaim(
        additionalClaimId: InternalID,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
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
     * Update a general additional claim row
     * @param additionalClaimId The ID of the additional claim.
     * @param requestBody
     * @returns AdditionalClaim Successfully updated the claim row.
     * @throws ApiError
     */
    public static updateGeneralAdditionalClaim(
        additionalClaimId: InternalID,
        requestBody: AddAdditionalClaim,
    ): CancelablePromise<AdditionalClaim> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
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
     * Delete a general additional claim
     * @param additionalClaimId The ID of the additional claim.
     * @returns void
     * @throws ApiError
     */
    public static deleteGeneralAdditionalClaim(
        additionalClaimId: InternalID,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/subordinates/additional-claims/{additionalClaimsID}',
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
        requestBody: Array<AdditionalClaim>,
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
     * @param subordinateId The id of the subordinate
     * @param requestBody
     * @returns Subordinate Successfully changed subordinate status.
     * @throws ApiError
     */
    public static changeSubordinateStatus(
        subordinateId: InternalID,
        requestBody: SubordinateStatus,
    ): CancelablePromise<Subordinate> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/admin/subordinates/{subordinateID}/status',
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
     * Get subordinate event history
     * @param subordinateId The id of the subordinate
     * @returns SubordinateHistory Successful response returning the subordinate's event history.
     * @throws ApiError
     */
    public static getSubordinateHistory(
        subordinateId: InternalID,
    ): CancelablePromise<SubordinateHistory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/subordinates/{subordinateID}/history',
            path: {
                'subordinateID': subordinateId,
            },
            errors: {
                404: `The requested resource was not found`,
                500: `Internal server error`,
            },
        });
    }
}
